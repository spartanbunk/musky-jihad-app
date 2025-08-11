# Debug Plan: Species Selector & Report Parsing Issues

## 🎯 **Issues to Investigate**
1. Species selector not showing fish from the daily report
2. Species descriptions not being parsed/transferred from daily fishing report
3. Need to verify what species are actually in the current report

## 🔍 **Debugging Steps**

### 1. **Inspect Current Daily Report Content**
- Fetch the actual daily report content from the API
- Log the raw content to see exact formatting
- Identify all species mentioned and their section structures

### 2. **Create Parser Test Function**
- Build a standalone test function to debug the parsing logic
- Test parsing against the actual report content
- Log each parsing attempt and what it finds/doesn't find

### 3. **Verify Species List Alignment** 
- Compare species in the report vs species in selector
- Update selector to match exactly what's in the report
- Ensure species IDs match between selector and parser

### 4. **Test Parsing Patterns**
- Test different regex patterns against real report structure
- Check for edge cases in formatting (spacing, punctuation, etc.)
- Verify content extraction length and quality

### 5. **Add Debug Logging**
- Add console.log statements to track parsing flow
- Log successful/failed matches for each species
- Show extracted content vs fallback usage

## 🛠️ **Files to Create/Modify**
- Create `debug_parser.js` - Standalone parser testing
- Update `FishingDashboard.js` - Add debug logging
- Update `SpeciesSelector.js` - Fix species list
- Test the full flow with real data

## ✅ **Success Criteria**
- Parser successfully extracts species content from daily report  
- Species selector shows only fish that exist in the report
- AI recommendations show real content, not fallbacks
- Debug logs clearly show what's working/failing