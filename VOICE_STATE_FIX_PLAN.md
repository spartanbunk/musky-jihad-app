# React State Management Fix for Voice Workflow

## Critical Issue Diagnosis
**As a React State Management Expert, the core problem is clear:**

The voice recognition handlers are suffering from **stale closure syndrome** - they're capturing state values at the time of creation and never seeing updates. This is why depth isn't being stored and the workflow stops.

## The React State Problems

### 1. **Stale Closure in Recognition Handler**
```javascript
// Problem: This handler captures state when created
recognition.onresult = (event) => {
  // This uses OLD catchData, tempData values!
  handleVoiceResult(transcript, confidence)
}
```

### 2. **Async State Update Race Condition**
```javascript
// Problem: State update is async
setCatchData(prev => ({ ...prev, depth: value }))
// This runs BEFORE state updates!
console.log(catchData.depth) // Still old value!
```

### 3. **Event Dispatch Inside setState Breaking Flow**
```javascript
setCatchData(prev => {
  // Dispatching here disrupts recognition!
  window.dispatchEvent(...)
  return newData
})
```

## The Master Solution

### Step 1: Add Refs for Current Values
```javascript
// Add these refs to track current values
const catchDataRef = useRef(catchData)
const tempDataRef = useRef(tempData)

// Keep refs synchronized
useEffect(() => {
  catchDataRef.current = catchData
}, [catchData])

useEffect(() => {
  tempDataRef.current = tempData
}, [tempData])
```

### Step 2: Fix Depth Confirmation Handler
```javascript
const handleDepthConfirmation = async (transcript) => {
  if (confirmation.confirmed) {
    const depthValue = tempDataRef.current.depth // Use ref!
    
    // Update ref immediately
    catchDataRef.current = { ...catchDataRef.current, depth: depthValue }
    tempDataRef.current = { ...tempDataRef.current, depth: '' }
    
    // Update state for UI
    setCatchData(prev => ({ ...prev, depth: depthValue }))
    setTempData(prev => ({ ...prev, depth: '' }))
    
    // Dispatch with current values from ref
    window.dispatchEvent(new CustomEvent('voiceWorkflowComplete', {
      detail: {
        ...catchDataRef.current,
        workflowStage: 'depth_confirmed'
      }
    }))
    
    // Continue workflow
    setVoiceState(VOICE_STATES.COLLECTING_SPECIES)
    voiceStateRef.current = VOICE_STATES.COLLECTING_SPECIES
    
    await speak("Great! Now, what species did you catch?")
    
    // Restart recognition properly
    if (recognitionRef.current) {
      setTimeout(() => {
        recognitionRef.current.start()
      }, 500)
    }
  }
}
```

### Step 3: Fix Recognition Handler Creation
```javascript
useEffect(() => {
  if (!recognitionRef.current) return
  
  // Re-create handler when state changes
  recognitionRef.current.onresult = (event) => {
    // This will now see current state via refs
    const currentState = voiceStateRef.current
    const currentCatchData = catchDataRef.current
    const currentTempData = tempDataRef.current
    
    handleVoiceResult(transcript, confidence)
  }
}, [voiceState, catchData, tempData]) // Re-create on changes
```

### Step 4: Ensure Recognition Continuity
```javascript
// Never stop recognition in state updates
// Always use setTimeout for restarts
// Keep recognition running between state transitions
```

## Implementation Priority

1. **IMMEDIATE**: Add refs for catchData and tempData
2. **CRITICAL**: Move event dispatch OUT of setState callbacks
3. **ESSENTIAL**: Use refs in all voice handlers
4. **IMPORTANT**: Fix recognition restart timing

## Expected Result
- Depth will be captured and stored correctly
- Workflow will continue to species collection
- Modal will update with depth value
- No more stale state issues

## Testing Checklist
- [ ] Say "Mark fish" - modal opens
- [ ] Say depth (e.g., "20 feet") - heard correctly
- [ ] Confirm with "yes" - depth stored
- [ ] Workflow continues to species
- [ ] Modal shows depth value

This is a classic React closure problem that requires refs for immediate value access while maintaining state for UI updates.