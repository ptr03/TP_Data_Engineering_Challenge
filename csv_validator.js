// csv_validator.js
const fs = require('fs');
const path = require('path');

class CampaignCSVValidator {
  constructor(csvFilePath) {
    this.csvFilePath = csvFilePath;
    this.stats = { totalRows:0, validRows:0, errorRows:0, nullCounts:{}, parseErrors:[] };
  }

  run() {
    console.log('Starting CSV validation...');
    if (!fs.existsSync(this.csvFilePath)) {
      console.error('CSV not found:', this.csvFilePath); process.exit(1);
    }
    const content = fs.readFileSync(this.csvFilePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) { console.log('No data rows found'); process.exit(0); }

    const headers = lines[0].split(',').map(h => h.trim());
    headers.forEach(h => this.stats.nullCounts[h]=0);
    const data = lines.slice(1);
    this.stats.totalRows = data.length;

    data.forEach((line, i) => {
      const rowNumber = i+2;
      const values = this.parseCSVLine(line);
      if (values.length !== headers.length) {
        this.addError(rowNumber, 'COLUMN_COUNT_MISMATCH', `Expected ${headers.length} columns, got ${values.length}`);
        return;
      }
      const row = {};
      headers.forEach((h, idx)=> row[h]=values[idx]);
      const ok = this.validateRow(row, rowNumber);
      if (ok) this.stats.validRows++; else this.stats.errorRows++;
    });

    this.report();
    this.writeErrorsFile();
  }

  parseCSVLine(line) {
    const result = [];
    let cur = '', inQuotes = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur=''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  normalizeNumber(str) {
    if (!str) return NaN;
    const s = str.trim().replace(/\s/g,'');
    if (s.indexOf(',') > -1 && s.indexOf('.') === -1) {
      return parseFloat(s.replace(',', '.'));
    }
    return parseFloat(s.replace(/,/g, ''));
  }

  validateRow(row, rowNumber) {
    const required = ['date','campaign_id','campaign_name','campaign_type','impressions','clicks','cost','conversions','conversion_value'];
    const errors = [];

    for (const f of required) {
      if (!row[f] || row[f].toString().trim()==='') {
        this.stats.nullCounts[f] = (this.stats.nullCounts[f]||0) + 1;
        errors.push(`${f} is empty`);
      }
    }
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(row.date) && !isNaN(new Date(row.date).getTime());
    if (!dateOk) errors.push(`Invalid date: ${row.date} (expected YYYY-MM-DD)`);

    if (!/^[-\w]+$/.test(row.campaign_id)) errors.push(`Invalid campaign_id: ${row.campaign_id}`);

    const types = ['Search','Shopping','Display','Video'];
    if (!types.includes(row.campaign_type)) errors.push(`campaign_type must be one of ${types.join(', ')}, got ${row.campaign_type}`);

    const impressions = parseInt(row.impressions.toString().replace(/\D/g,''), 10);
    const clicks = parseInt(row.clicks.toString().replace(/\D/g,''), 10);
    const cost = this.normalizeNumber(row.cost);
    const conversions = parseInt(row.conversions.toString().replace(/\D/g,''),10);
    const conversion_value = this.normalizeNumber(row.conversion_value);

    if (isNaN(impressions) || impressions < 0) errors.push(`Invalid impressions: ${row.impressions}`);
    if (isNaN(clicks) || clicks < 0) errors.push(`Invalid clicks: ${row.clicks}`);
    if (isNaN(cost) || cost < 0) errors.push(`Invalid cost: ${row.cost}`);
    if (isNaN(conversions) || conversions < 0) errors.push(`Invalid conversions: ${row.conversions}`);
    if (isNaN(conversion_value) || conversion_value < 0) errors.push(`Invalid conversion_value: ${row.conversion_value}`);

    if (!isNaN(impressions) && !isNaN(clicks) && clicks > impressions) errors.push(`clicks (${clicks}) > impressions (${impressions})`);
    if (!isNaN(clicks) && !isNaN(conversions) && conversions > clicks) errors.push(`conversions (${conversions}) > clicks (${clicks})`);

    if (errors.length>0) {
      this.addError(rowNumber, 'VALIDATION', errors.join('; '));
      return false;
    }
    return true;
  }

  addError(row, type, msg) { this.stats.parseErrors.push({row,type,message:msg}); }

  report() {
    console.log('\nVALIDATION REPORT');
    console.log('Total rows:', this.stats.totalRows);
    console.log('Valid rows:', this.stats.validRows);
    console.log('Error rows:', this.stats.errorRows);
    console.log('Null counts:', this.stats.nullCounts);
    const types = {};
    this.stats.parseErrors.forEach(e => types[e.type]=(types[e.type]||0)+1);
    console.log('Error types:', types);
    console.log('Sample errors:', this.stats.parseErrors.slice(0,10));
  }

  writeErrorsFile() {
    if (this.stats.parseErrors.length===0) { console.log('No errors found'); return; }
    if (!fs.existsSync('errors')) fs.mkdirSync('errors');
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const out = path.join('errors', `${ts}_errors.csv`);
    const header = 'row,error_type,error_message\n';
    const rows = this.stats.parseErrors.map(e => `${e.row},"${e.type}","${e.message.replace(/"/g,'""')}"`).join('\n');
    fs.writeFileSync(out, header+rows, 'utf8');
    console.log('Errors written to', out);
  }
}

if (require.main === module) {
  const csvFile = process.argv[2] || 'data/campaigns.csv';
  const v = new CampaignCSVValidator(csvFile);
  v.run();
}

module.exports = CampaignCSVValidator;
