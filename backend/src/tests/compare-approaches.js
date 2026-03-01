// backend/src/tests/compare-approaches.js
// Compare: Keyword Detection vs Direct Claude Understanding

import dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Test case: Beach + Romantic + Schengen
const TEST_CASE = {
  customField: "voyage en amoureux a un endroit ou on peut se baigner en europe (visa schengen)",
  budget: 600,
  duration: 9,
  origin: "Paris",
  travelers: 2,
};

// APPROACH A: With Keyword Detection (current)
async function approachA_WithKeywords() {
  const { customField, budget, duration, origin } = TEST_CASE;

  // Simulate keyword detection
  const hasBeach = ['baigner', 'nager', 'mer', 'plage'].some(kw => customField.toLowerCase().includes(kw));
  const hasRomantic = ['amoureux', 'romantic', 'couple'].some(kw => customField.toLowerCase().includes(kw));
  const wantsSchengen = ['schengen', 'europe'].some(kw => customField.toLowerCase().includes(kw));

  let constraints = '';
  if (hasBeach) {
    constraints += `\n⚠️ CRITICAL: ONLY suggest coastal cities with beaches. NO landlocked cities like Budapest, Vienna, Prague!`;
  }
  if (hasRomantic) {
    constraints += `\n💕 ROMANTIC: Prioritize charming, couples-friendly destinations.`;
  }
  if (wantsSchengen) {
    constraints += `\n🇪🇺 SCHENGEN ONLY: Austria, Belgium, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland.`;
  }

  const prompt = `Recommend 6 destinations for:
- Budget: €${budget}
- Duration: ${duration} days
- From: ${origin}
- Request: "${customField}"
${constraints}

Return ONLY a JSON array: ["City1", "City2", ...]`;

  console.log('\n📋 APPROACH A: With Keyword Detection');
  console.log('Detected: Beach=' + hasBeach + ', Romantic=' + hasRomantic + ', Schengen=' + wantsSchengen);
  console.log('Constraints added:', constraints ? 'YES' : 'NONE');

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 200,
    temperature: 0.9,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();
  console.log('Response:', text);
  return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, ''));
}

// APPROACH B: Direct to Claude (no keyword detection)
async function approachB_DirectClaude() {
  const { customField, budget, duration, origin } = TEST_CASE;

  const prompt = `You are a travel expert. A user from ${origin} wants to travel.

USER'S EXACT REQUEST:
"${customField}"

CONSTRAINTS:
- Budget: €${budget} total (flights + ${duration - 1} nights hotel)
- Duration: ${duration} days

IMPORTANT: Read the user's request CAREFULLY. They mentioned:
- "baigner" = they want to SWIM → suggest COASTAL cities only
- "amoureux" = romantic couple trip → suggest charming destinations
- "schengen" = they need visa-free travel → Schengen zone only

Recommend 6 destinations that PERFECTLY match their request.
Return ONLY a JSON array: ["City1", "City2", ...]`;

  console.log('\n📋 APPROACH B: Direct Claude (no keyword detection)');
  console.log('Just passing user request with interpretation hints');

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 200,
    temperature: 0.9,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();
  console.log('Response:', text);
  return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, ''));
}

// APPROACH C: Minimal prompt (trust Claude completely)
async function approachC_MinimalPrompt() {
  const { customField, budget, duration, origin } = TEST_CASE;

  const prompt = `Recommend 6 travel destinations for someone from ${origin} with €${budget} for ${duration} days.

Their request: "${customField}"

Return ONLY a JSON array: ["City1", "City2", ...]`;

  console.log('\n📋 APPROACH C: Minimal Prompt (trust Claude)');
  console.log('No constraints, no hints - just the raw request');

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 200,
    temperature: 0.9,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();
  console.log('Response:', text);
  return JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, ''));
}

// Run comparison
async function runComparison() {
  console.log('🧪 COMPARING APPROACHES');
  console.log('='.repeat(60));
  console.log('Test case:', TEST_CASE.customField);
  console.log('Expected: Coastal cities in Schengen zone (Nice, Split, Malaga, etc.)');
  console.log('Forbidden: Budapest, Vienna, Prague, Belgrade, Sofia (landlocked)');
  console.log('='.repeat(60));

  const LANDLOCKED = ['Budapest', 'Vienna', 'Prague', 'Belgrade', 'Sofia', 'Munich', 'Zurich', 'Bern'];

  try {
    // Run all 3 approaches
    const resultsA = await approachA_WithKeywords();
    const resultsB = await approachB_DirectClaude();
    const resultsC = await approachC_MinimalPrompt();

    // Check for landlocked cities
    const checkLandlocked = (destinations) =>
      destinations.filter(d => LANDLOCKED.some(l => d.includes(l)));

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS COMPARISON');
    console.log('='.repeat(60));

    console.log('\nApproach A (Keywords):', resultsA.join(', '));
    const landlockedA = checkLandlocked(resultsA);
    console.log('  Landlocked cities:', landlockedA.length > 0 ? landlockedA.join(', ') + ' ❌' : 'None ✅');

    console.log('\nApproach B (Direct):', resultsB.join(', '));
    const landlockedB = checkLandlocked(resultsB);
    console.log('  Landlocked cities:', landlockedB.length > 0 ? landlockedB.join(', ') + ' ❌' : 'None ✅');

    console.log('\nApproach C (Minimal):', resultsC.join(', '));
    const landlockedC = checkLandlocked(resultsC);
    console.log('  Landlocked cities:', landlockedC.length > 0 ? landlockedC.join(', ') + ' ❌' : 'None ✅');

    console.log('\n' + '='.repeat(60));
    console.log('VERDICT:');
    if (landlockedA.length === 0 && landlockedB.length === 0 && landlockedC.length === 0) {
      console.log('✅ All approaches work! Keyword detection may be UNNECESSARY.');
    } else if (landlockedC.length > landlockedA.length) {
      console.log('⚠️  Minimal prompt has more errors. Keyword detection HELPS.');
    } else {
      console.log('🤔 Mixed results. Need more testing.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('apiKey')) {
      console.log('\n💡 To run this test, add ANTHROPIC_API_KEY to backend/.env');
    }
  }
}

runComparison();
