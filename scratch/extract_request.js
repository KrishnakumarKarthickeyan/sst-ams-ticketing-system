const fs = require('fs');
const path = require('path');

const logPath = '/Users/krishnakumarkarthickeyan/.gemini/antigravity/brain/389dd409-492f-4433-9e1f-b25c9de7c20e/.system_generated/logs/transcript.jsonl';
const fileContent = fs.readFileSync(logPath, 'utf8');

const lines = fileContent.split('\n');
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.source === 'USER_EXPLICIT' && obj.content && obj.content.includes('7 fixes')) {
      console.log("=== FULL USER REQUEST ===");
      console.log(obj.content);
      console.log("=========================");
      break;
    }
  } catch (e) {
    // ignore parse errors
  }
}
