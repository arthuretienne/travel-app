// backend/src/services/logger.js
// Comprehensive logging service for development debugging

class Logger {
  constructor() {
    this.stats = {
      claudeApiCalls: 0,
      amadeusApiCalls: 0,
      emailsSent: 0,
      emailsFailed: 0,
      userActions: [],
      apiErrors: [],
    };
  }

  /**
   * Log Claude API call
   */
  logClaudeAPI({ operation, input, output, error, tokensUsed, duration }) {
    this.stats.claudeApiCalls++;

    console.log('\n🤖 ========== CLAUDE API CALL ==========');
    console.log('🤖 Timestamp:', new Date().toISOString());
    console.log('🤖 Operation:', operation);
    console.log('🤖 Call Count:', this.stats.claudeApiCalls);

    if (input) {
      const inputString = typeof input === 'string'
        ? input.substring(0, 200) + (input.length > 200 ? '...' : '')
        : JSON.stringify(input, null, 2);
      console.log('🤖 Input:', inputString ? inputString.substring(0, 500) : 'N/A');
    }

    if (tokensUsed) {
      console.log('🤖 Tokens Used:', tokensUsed);
    }

    if (duration) {
      console.log('🤖 Duration:', `${duration}ms`);
    }

    if (error) {
      console.error('❌ Claude API Error:', error);
      this.stats.apiErrors.push({
        service: 'Claude',
        operation,
        error: error.message || error,
        timestamp: new Date().toISOString(),
      });
    } else if (output) {
      const outputString = typeof output === 'string'
        ? output.substring(0, 300) + (output.length > 300 ? '...' : '')
        : JSON.stringify(output, null, 2);
      console.log('✅ Claude Response:', outputString ? outputString.substring(0, 500) : 'N/A');
    }

    console.log('🤖 =======================================\n');
  }

  /**
   * Log Amadeus API call
   */
  logAmadeusAPI({ operation, params, results, error, duration }) {
    this.stats.amadeusApiCalls++;

    console.log('\n✈️  ========== AMADEUS API CALL ==========');
    console.log('✈️  Timestamp:', new Date().toISOString());
    console.log('✈️  Operation:', operation);
    console.log('✈️  Call Count:', this.stats.amadeusApiCalls);

    if (params) {
      console.log('✈️  Parameters:', JSON.stringify(params, null, 2));
    }

    if (duration) {
      console.log('✈️  Duration:', `${duration}ms`);
    }

    if (error) {
      console.error('❌ Amadeus API Error:', error);
      this.stats.apiErrors.push({
        service: 'Amadeus',
        operation,
        error: error.message || error,
        timestamp: new Date().toISOString(),
      });
    } else if (results) {
      console.log('✅ Results Count:', Array.isArray(results) ? results.length : 'N/A');
      const sampleResult = Array.isArray(results) ? results[0] : results;
      const resultString = JSON.stringify(sampleResult, null, 2);
      console.log('✅ Sample Result:', resultString ? resultString.substring(0, 500) : 'N/A');
    }

    console.log('✈️  =======================================\n');
  }

  /**
   * Log email sending
   */
  logEmail({ type, recipient, status, error, emailId }) {
    if (status === 'success') {
      this.stats.emailsSent++;
    } else {
      this.stats.emailsFailed++;
    }

    console.log('\n📧 ========== EMAIL LOG ==========');
    console.log('📧 Timestamp:', new Date().toISOString());
    console.log('📧 Type:', type);
    console.log('📧 Recipient:', recipient);
    console.log('📧 Status:', status);
    console.log('📧 Total Sent:', this.stats.emailsSent);
    console.log('📧 Total Failed:', this.stats.emailsFailed);

    if (error) {
      console.error('❌ Email Error:', error);
    }

    if (emailId) {
      console.log('✅ Email ID:', emailId);
    }

    console.log('📧 ================================\n');
  }

  /**
   * Log user action/workflow step
   */
  logUserAction({ userId, userName, action, details }) {
    this.stats.userActions.push({
      userId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString(),
    });

    console.log('\n👤 ========== USER ACTION ==========');
    console.log('👤 Timestamp:', new Date().toISOString());
    console.log('👤 User ID:', userId);
    console.log('👤 User Name:', userName || 'Guest');
    console.log('👤 Action:', action);

    if (details) {
      console.log('👤 Details:', JSON.stringify(details, null, 2));
    }

    console.log('👤 Total Actions:', this.stats.userActions.length);
    console.log('👤 ===================================\n');
  }

  /**
   * Log AI recommendation generation process
   */
  logRecommendation({ step, tripId, groupPreferences, aiPrompt, aiResponse, destinations, duration }) {
    console.log('\n🎯 ========== AI RECOMMENDATION GENERATION ==========');
    console.log('🎯 Timestamp:', new Date().toISOString());
    console.log('🎯 Step:', step);
    console.log('🎯 Trip ID:', tripId);

    if (duration) {
      console.log('🎯 Step Duration:', `${duration}ms`);
    }

    if (groupPreferences) {
      console.log('🎯 Group Preferences Summary:');
      console.log('   - Member Count:', groupPreferences.memberCount);
      console.log('   - Budget Range:', `${groupPreferences.budget?.min} - ${groupPreferences.budget?.max} EUR`);
      console.log('   - Climate Preferences:', groupPreferences.climate?.join(', ') || 'None');
      console.log('   - Activities:', groupPreferences.activities?.slice(0, 5).join(', ') || 'None');
      console.log('   - Duration:', groupPreferences.availability?.recommendedDuration, 'days');

      if (groupPreferences.dietaryRestrictions && groupPreferences.dietaryRestrictions.length > 0) {
        console.log('   - Dietary Restrictions:', groupPreferences.dietaryRestrictions.join(', '));
      }

      if (groupPreferences.accessibility && groupPreferences.accessibility.length > 0) {
        console.log('   - Accessibility Needs:', groupPreferences.accessibility.join(', '));
      }
    }

    if (aiPrompt) {
      console.log('🎯 AI Prompt Length:', aiPrompt.length, 'characters');
      console.log('🎯 AI Prompt Preview:', aiPrompt.substring(0, 300) + '...');
    }

    if (aiResponse) {
      console.log('🎯 AI Response Length:', aiResponse.length, 'characters');
      console.log('🎯 AI Response Preview:', aiResponse.substring(0, 300) + '...');
    }

    if (destinations) {
      console.log('🎯 Destinations Generated:', destinations.length);
      destinations.forEach((dest, index) => {
        const destName = dest.city || dest.name || 'Unknown';
        console.log(`   ${index + 1}. ${destName} (${dest.country}) - Score: ${dest.matchScore || dest.popularityScore || 'N/A'}`);
      });
    }

    console.log('🎯 ==================================================\n');
  }

  /**
   * Log workflow state change
   */
  logWorkflow({ tripId, tripName, fromState, toState, triggeredBy, memberCount }) {
    console.log('\n🔄 ========== WORKFLOW STATE CHANGE ==========');
    console.log('🔄 Timestamp:', new Date().toISOString());
    console.log('🔄 Trip ID:', tripId);
    console.log('🔄 Trip Name:', tripName);
    console.log('🔄 State Transition:', `${fromState} → ${toState}`);
    console.log('🔄 Triggered By:', triggeredBy);
    console.log('🔄 Member Count:', memberCount);
    console.log('🔄 ===========================================\n');
  }

  /**
   * Get statistics summary
   */
  getStats() {
    return {
      ...this.stats,
      recentActions: this.stats.userActions.slice(-10),
      recentErrors: this.stats.apiErrors.slice(-10),
    };
  }

  /**
   * Print statistics summary
   */
  printStats() {
    console.log('\n📊 ========== SESSION STATISTICS ==========');
    console.log('📊 Claude API Calls:', this.stats.claudeApiCalls);
    console.log('📊 Amadeus API Calls:', this.stats.amadeusApiCalls);
    console.log('📊 Emails Sent:', this.stats.emailsSent);
    console.log('📊 Emails Failed:', this.stats.emailsFailed);
    console.log('📊 User Actions:', this.stats.userActions.length);
    console.log('📊 API Errors:', this.stats.apiErrors.length);

    if (this.stats.apiErrors.length > 0) {
      console.log('\n📊 Recent Errors:');
      this.stats.apiErrors.slice(-5).forEach((err, idx) => {
        console.log(`   ${idx + 1}. [${err.service}] ${err.operation}: ${err.error}`);
      });
    }

    console.log('📊 =========================================\n');
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      claudeApiCalls: 0,
      amadeusApiCalls: 0,
      emailsSent: 0,
      emailsFailed: 0,
      userActions: [],
      apiErrors: [],
    };
    console.log('📊 Statistics reset');
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper to log API call duration
export function withDuration(fn) {
  return async function (...args) {
    const startTime = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw { error, duration };
    }
  };
}

export default logger;
