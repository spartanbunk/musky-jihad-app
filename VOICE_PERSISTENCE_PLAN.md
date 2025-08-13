# Voice Command Field Persistence & Re-prompting Plan

## Current Issues Analysis
1. **Modal Display Problem**: Voice workflow data not visually updating in the UI modal
2. **Field Persistence Issue**: Voice recognizes "10ft" for depth but doesn't show in interface  
3. **Missing Re-prompting**: No retry mechanism when fields aren't filled correctly
4. **User Feedback Gap**: Users can't see what data was captured during voice workflow

## Implementation Strategy

### Phase 1: Fix Visual Feedback Loop
1. **Enhanced State Display**
   - Make voice data collection visually prominent
   - Show real-time field updates as voice captures data
   - Add visual confirmation when each field is successfully captured

2. **Modal Integration** 
   - Ensure voice-captured data populates the CatchLogger modal
   - Show intermediate states during voice collection
   - Display "field captured" confirmations

### Phase 2: Implement Field Re-prompting System
1. **Retry Logic Per Field**
   - Add retry counters for each field (depth, species, length, weight, lure)
   - Re-prompt user every 20 seconds if field not captured
   - Maximum 3 attempts per field before offering manual entry

2. **Smart Voice Recognition**
   - Improve parsing confidence thresholds
   - Better fuzzy matching for species/lure recognition
   - Handle edge cases like "ten feet" vs "10ft"

### Phase 3: Enhanced User Experience
1. **Audio Feedback**
   - Confirm what was heard: "I heard 10 feet for depth"
   - Ask for confirmation: "Did I get that right?"
   - Clear error messages: "I didn't understand, please repeat"

2. **Visual Indicators**
   - Progress bar showing workflow completion
   - Field-by-field checkmarks
   - Clear "listening" vs "processing" states

## Technical Implementation

### Voice State Machine Enhancement
- Add retry counters to each state
- Implement 20-second timeout with re-prompting
- Add confirmation states for each field
- Better error handling and fallbacks

### UI Component Updates
- Real-time field population display
- Better integration with CatchLogger modal
- Visual feedback for successful captures
- Loading states during voice processing

## Success Metrics
- Users can see each field populate in real-time
- Failed voice captures trigger re-prompts within 20 seconds
- Complete voice workflow populates CatchLogger modal correctly
- Clear visual feedback at every step

## Current Implementation Status

### COMPLETED
- ✅ Basic voice workflow (Mark Fish → depth → species → length → weight → lure → photo)
- ✅ GPS auto-capture on "Mark Fish" command
- ✅ Voice state machine with all fishing data collection states
- ✅ Photo capture and database submission
- ✅ Real-time voice command display

### NEEDS FIXING
- ❌ **Visual Field Updates**: Voice data not showing in UI as it's captured
- ❌ **Re-prompting System**: No retry when fields fail to capture
- ❌ **Audio Confirmations**: No "I heard X" feedback to user
- ❌ **Modal Integration**: Voice data not populating CatchLogger modal
- ❌ **Timeout Handling**: No 20-second re-prompt system

## Implementation Tasks

### Task 1: Enhanced Visual Feedback
- Show captured fields with checkmarks in real-time
- Display "I heard X" confirmations for each field
- Better visual states for listening/processing/captured

### Task 2: Re-prompting System
- Add retry counters to each voice state
- Implement 20-second timeout with automatic re-prompt
- Audio confirmation of captured data

### Task 3: Modal Integration
- Pass voice-captured data to CatchLogger modal
- Show voice workflow progress in modal
- Allow switching between voice and manual input

### Task 4: Improved Voice Recognition
- Better confidence thresholds for field acceptance
- Enhanced fuzzy matching for species/lures
- Handle more natural language patterns