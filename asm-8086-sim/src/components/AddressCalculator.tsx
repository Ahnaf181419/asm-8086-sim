import { useState } from 'react'
import { physicalAddress, parseHex16, hex5, hex4, bin20 } from './addressMath'

export default function AddressCalculator() {
  const [segment, setSegment] = useState('A4FB')
  const [offset, setOffset] = useState('4872')

  const segVal = parseHex16(segment)
  const offVal = parseHex16(offset)
  const shiftedSeg = (segVal & 0xffff) * 16
  const physVal = physicalAddress(segment, offset)

  const setPreset = (s: string, o: string) => {
    setSegment(s)
    setOffset(o)
  }

  return (
    <div
      style={{
        border: '1px solid var(--border-bright)',
        background: 'var(--panel2)',
        borderRadius: '6px',
        padding: '14px 18px',
        margin: '20px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>
          🧮 Interactive 20-Bit Physical Address Calculator
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{ fontSize: '10px', padding: '2px 6px' }}
            onClick={() => setPreset('A4FB', '4872')}
          >
            Lecture (A4FB:4872)
          </button>
          <button
            type="button"
            style={{ fontSize: '10px', padding: '2px 6px' }}
            onClick={() => setPreset('FFFF', '0000')}
          >
            Reset Vector (FFFF:0000)
          </button>
          <button
            type="button"
            style={{ fontSize: '10px', padding: '2px 6px' }}
            onClick={() => setPreset('1234', '5678')}
          >
            1234:5678
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
          Segment (16-bit):
          <input
            type="text"
            maxLength={4}
            value={segment}
            onChange={(e) => setSegment(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))}
            style={{
              width: '60px',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              textAlign: 'center',
              color: 'var(--accent)',
            }}
          />
          H
        </label>
        <span style={{ color: 'var(--text-faint)' }}>:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
          Offset (16-bit):
          <input
            type="text"
            maxLength={4}
            value={offset}
            onChange={(e) => setOffset(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))}
            style={{
              width: '60px',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              textAlign: 'center',
              color: 'var(--warn)',
            }}
          />
          H
        </label>
      </div>

      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '12px',
          background: 'var(--editor-bg)',
          padding: '10px 14px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          lineHeight: '1.6',
        }}
      >
        <div>
          {'  '}
          <span style={{ color: 'var(--accent)' }}>{hex5(shiftedSeg)}H</span>
          <span style={{ color: 'var(--text-dim)' }}> ; Segment {hex4(segVal)}H shifted left 4 bits (× 16)</span>
        </div>
        <div>
          + <span style={{ color: 'var(--warn)' }}>{hex4(offVal).padStart(5, ' ')}H</span>
          <span style={{ color: 'var(--text-dim)' }}> ; Offset</span>
        </div>
        <div style={{ color: 'var(--border-bright)' }}>---------</div>
        <div style={{ fontWeight: 600 }}>
          ={' '}
          <span style={{ color: 'var(--accent)', textShadow: '0 0 6px rgba(51, 255, 102, 0.4)' }}>
            {hex5(physVal)}H
          </span>
          <span style={{ color: 'var(--text-faint)', marginLeft: '12px' }}>
            ({physVal} decimal / 1 MB address space)
          </span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>
          Address Bus [A19..A0]:{' '}
          <span style={{ color: 'var(--info)' }}>{bin20(physVal).slice(0, 4)}</span>{' '}
          <span style={{ color: 'var(--text)' }}>{bin20(physVal).slice(4, 8)}</span>{' '}
          <span style={{ color: 'var(--text)' }}>{bin20(physVal).slice(8, 12)}</span>{' '}
          <span style={{ color: 'var(--text)' }}>{bin20(physVal).slice(12, 16)}</span>{' '}
          <span style={{ color: 'var(--accent)' }}>{bin20(physVal).slice(16, 20)}</span>
        </div>
      </div>
    </div>
  )
}
