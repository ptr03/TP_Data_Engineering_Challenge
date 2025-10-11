#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class CampaignImporter {
  constructor({ batchSize=500 } = {}) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
    this.supabase = createClient(url, key);
    this.batchSize = batchSize;
    this.processed = 0;
    this.errors = [];
    this.campaignCache = new Set();
    if (!fs.existsSync('errors')) fs.mkdirSync('errors');
    this.timestamp = new Date().toISOString().replace(/[:.]/g,'-');
  }

  async importCSV(csvPath) {
    return new Promise((resolve, reject) => {
      const metricsBatch = [];
      const campaignsBatch = [];
      let batchNum = 0;

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            const validated = this.validateRow(row);
            if (!this.campaignCache.has(validated.campaign_id)) {
              campaignsBatch.push({
                campaign_id: validated.campaign_id,
                campaign_name: validated.campaign_name,
                campaign_type: validated.campaign_type
              });
              this.campaignCache.add(validated.campaign_id);
            }
            metricsBatch.push({
              campaign_id: validated.campaign_id,
              date: validated.date,
              impressions: validated.impressions,
              clicks: validated.clicks,
              cost: validated.cost,
              conversions: validated.conversions,
              conversion_value: validated.conversion_value
            });

            if (metricsBatch.length >= this.batchSize) {
              batchNum++;
              // flush but do not await here to keep streaming; errors will be collected
              this.flushBatch(campaignsBatch.splice(0), metricsBatch.splice(0), batchNum).catch(err=>{
                this.errors.push({batch:batchNum, error: err.message});
              });
            }
            this.processed++;
          } catch (err) {
            this.errors.push({ row:this.processed+1, error: err.message, data: row });
          }
        })
        .on('end', async () => {
          batchNum++;
          try {
            if (campaignsBatch.length) await this.flushBatch(campaignsBatch, []);
            if (metricsBatch.length) await this.flushBatch([], metricsBatch, batchNum);
            await this.finish();
            resolve();
          } catch (err) { reject(err); }
        })
        .on('error', (err) => reject(err));
    });
  }

  validateRow(row) {
    function parseNum(v) {
      if (v===null||v===undefined) return NaN;
      const s = v.toString().trim().replace(/\s/g,'');
      if (s.indexOf(',')>-1 && s.indexOf('.')===-1) return parseFloat(s.replace(',','.'));
      return parseFloat(s.replace(/,/g,''));
    }
    const date = new Date(row.date);
    if (isNaN(date.getTime())) throw new Error(`Invalid date: ${row.date}`);
    const campaign_id = row.campaign_id ? row.campaign_id.toString().trim() : '';
    if (!campaign_id) throw new Error('campaign_id empty');
    const campaign_name = row.campaign_name ? row.campaign_name.toString().trim() : '';
    const campaign_type = row.campaign_type ? row.campaign_type.toString().trim() : '';
    const impressions = parseInt(row.impressions,10);
    const clicks = parseInt(row.clicks,10);
    const cost = Math.round(parseNum(row.cost)*100)/100;
    const conversions = parseInt(row.conversions,10);
    const conversion_value = Math.round(parseNum(row.conversion_value)*100)/100;

    if (isNaN(impressions) || impressions<0) throw new Error('Invalid impressions');
    if (isNaN(clicks) || clicks<0) throw new Error('Invalid clicks');
    if (isNaN(cost) || cost<0) throw new Error('Invalid cost');
    if (isNaN(conversions) || conversions<0) throw new Error('Invalid conversions');
    if (isNaN(conversion_value) || conversion_value<0) throw new Error('Invalid conversion_value');
    if (clicks > impressions) throw new Error('Clicks > impressions');
    if (conversions > clicks) throw new Error('Conversions > clicks');

    return {
      date: date.toISOString().split('T')[0],
      campaign_id, campaign_name, campaign_type,
      impressions, clicks, cost, conversions, conversion_value
    };
  }

  async flushBatch(campaigns, metrics, batchNum=0) {
    if (campaigns.length) {
      const { error: e1 } = await this.supabase.from('campaigns').upsert(campaigns, { onConflict: 'campaign_id' });
      if (e1) throw new Error(`Campaigns upsert failed: ${e1.message}`);
    }
    if (metrics.length) {
      const { error: e2 } = await this.supabase.from('campaign_metrics').insert(metrics);
      if (e2) {
        throw new Error(`Metrics insert failed: ${e2.message}`);
      }
    }
    console.log(`Flushed batch ${batchNum} - campaigns: ${campaigns.length}, metrics: ${metrics.length}`);
  }

  async finish() {
    console.log('\nIMPORT FINISHED');
    console.log('Processed rows:', this.processed);
    console.log('Errors count:', this.errors.length);
    if (this.errors.length) {
      const out = path.join('errors', `${this.timestamp}_import_errors.json`);
      fs.writeFileSync(out, JSON.stringify(this.errors, null, 2),'utf8');
      console.log('Errors saved to', out);
    }
  }
}

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.log('Usage: node import.js path/to/file.csv');
    process.exit(1);
  }
  (async ()=>{
    try {
      const importer = new CampaignImporter({ batchSize: 500 });
      await importer.importCSV(arg);
      console.log('Import done');
      process.exit(0);
    } catch (err) {
      console.error('Import error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = CampaignImporter;
