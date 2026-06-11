const dns = require('dns');

async function lookup() {
  const ip = '2406:da18:e5c:b701:5d7d:6470:a135:d1ac';
  console.log("Checking AWS IP ranges for:", ip);
  
  const response = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
  const data = await response.json();
  
  // Find which range matches 2406:da18:
  const matches = data.ipv6_prefixes.filter(p => {
    // A simple prefix match
    return ip.startsWith(p.ipv6_prefix.split('::')[0]);
  });
  
  console.log("Matches:", JSON.stringify(matches, null, 2));
}

lookup();
