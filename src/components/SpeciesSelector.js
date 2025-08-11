'use client'

export default function SpeciesSelector({ selectedSpecies, onSpeciesChange }) {
  const species = [
    { id: 'musky', name: 'Musky', emoji: '🐟', color: '#059669' },
    { id: 'bass', name: 'Smallmouth Bass', emoji: '🎣', color: '#7c3aed' },
    { id: 'walleye', name: 'Walleye', emoji: '🐠', color: '#d97706' },
    { id: 'perch', name: 'Yellow Perch', emoji: '🐟', color: '#eab308' },
    { id: 'crappie', name: 'Crappie', emoji: '🐠', color: '#8b5cf6' },
    { id: 'bluegill', name: 'Bluegill', emoji: '🐟', color: '#10b981' }
  ]

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {species.map(fish => (
        <button
          key={fish.id}
          onClick={() => onSpeciesChange(fish.id)}
          style={{
            padding: '8px 16px',
            border: selectedSpecies === fish.id ? `2px solid ${fish.color}` : '1px solid #e2e8f0',
            borderRadius: '20px',
            background: selectedSpecies === fish.id ? `${fish.color}15` : 'white',
            color: selectedSpecies === fish.id ? fish.color : '#64748b',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: selectedSpecies === fish.id ? '600' : '400',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            if (selectedSpecies !== fish.id) {
              e.target.style.background = '#f8fafc'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedSpecies !== fish.id) {
              e.target.style.background = 'white'
            }
          }}
        >
          <span>{fish.emoji}</span>
          <span>{fish.name}</span>
        </button>
      ))}
    </div>
  )
}