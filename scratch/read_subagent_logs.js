const fs = require('fs');
const path = require('path');

const paths = [
  '/Users/krishnakumarkarthickeyan/.gemini/antigravity/brain/821f1123-7fbe-4536-b00f-4633c9426cf3/.system_generated/logs/transcript.jsonl',
  '/Users/krishnakumarkarthickeyan/.gemini/antigravity/brain/fe435343-3e16-4250-b2cc-daaa9511f26f/.system_generated/logs/transcript.jsonl'
];

paths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`=== Reading ${path.basename(p)} ===`);
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes('STAGE')) {
          console.log(obj.content.substring(0, 1000));
          console.log("------------------------");
        }
      } catch (e) {}
    }
  } else {
    console.log(`Path does not exist: ${p}`);
  }
});
