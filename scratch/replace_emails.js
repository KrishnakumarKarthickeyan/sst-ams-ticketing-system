const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'context', 'TicketContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of manager@sap.com with manager@supportstudio.com
content = content.replace(/manager@sap\.com/g, 'manager@supportstudio.com');

// Replace all occurrences of consultant@sap.com with consultant@supportstudio.com
content = content.replace(/consultant@sap\.com/g, 'consultant@supportstudio.com');

// Replace all occurrences of customer@sap.com with customer@supportstudio.com
content = content.replace(/customer@sap\.com/g, 'customer@supportstudio.com');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated TicketContext.tsx emails!');
