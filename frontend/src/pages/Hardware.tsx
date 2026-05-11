export default function Hardware() {
  return (
    <div className="page-content">
      <div className="topbar"><h1>Hardware Guide</h1></div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">Recommended hardware tiers</div>
        <table className="hw-table">
          <thead>
            <tr><th>Tier</th><th>Board</th><th>Specs</th><th>AI Capability</th><th>Cost</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="hw-tier tier-minimal">Minimal</span></td>
              <td><strong>Raspberry Pi 5</strong><br /><span style={{ fontSize: 11, color: 'var(--faint)' }}>8GB RAM</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>ARM Cortex-A76<br />No dedicated NPU</td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>Sensor aggregation + rule-based logic. No LLM inference.</td>
              <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 13 }}>~£80</td>
            </tr>
            <tr>
              <td><span className="hw-tier tier-mvp">MVP</span></td>
              <td><strong>Orange Pi 5 Plus</strong><br /><span style={{ fontSize: 11, color: 'var(--faint)' }}>16GB RAM, RK3588</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>6 TOPS NPU<br />8-core ARM</td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>phi-3-mini q4 at 8–12 tok/s. Sufficient for farmer use.</td>
              <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 13 }}>~£130</td>
            </tr>
            <tr>
              <td><span className="hw-tier tier-mvp">MVP</span></td>
              <td><strong>Beelink EQ12 Mini PC</strong><br /><span style={{ fontSize: 11, color: 'var(--faint)' }}>32GB RAM, N100</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>Intel N100<br />iGPU</td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>phi-3-mini or mistral-7b-q4. Best for demo / dev.</td>
              <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 13 }}>~£180</td>
            </tr>
            <tr>
              <td><span className="hw-tier tier-prod">Production</span></td>
              <td><strong>Nvidia Jetson Orin NX</strong><br /><span style={{ fontSize: 11, color: 'var(--faint)' }}>16GB, LPDDR5</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>1024 CUDA cores<br />70 TOPS</td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>Mistral-7B full precision. On-device LoRA fine-tuning.</td>
              <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 13 }}>~£500</td>
            </tr>
            <tr>
              <td><span className="hw-tier tier-full">Full AI</span></td>
              <td><strong>Mini PC + eGPU</strong><br /><span style={{ fontSize: 11, color: 'var(--faint)' }}>RTX 4060 Ti</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>16GB VRAM<br />PCIe enclosure</td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>Any 13B model. Full fine-tuning nightly. Future-proof.</td>
              <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 13 }}>~£800</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Sensor shopping list (per allotment)</div>
          <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--muted)' }}>
            <div><strong style={{ color: 'var(--text)' }}>Capacitive moisture sensor</strong> × 3 — £3 each</div>
            <div><strong style={{ color: 'var(--text)' }}>NPK soil sensor</strong> (RS-485) × 1 — £35</div>
            <div><strong style={{ color: 'var(--text)' }}>DS18B20 soil temp probe</strong> × 2 — £4 each</div>
            <div><strong style={{ color: 'var(--text)' }}>DHT22 air temp/humidity</strong> × 1 — £5</div>
            <div><strong style={{ color: 'var(--text)' }}>BMP280 barometric</strong> × 1 — £3</div>
            <div><strong style={{ color: 'var(--text)' }}>Raspberry Pi Pico W</strong> (sensor hub) — £6</div>
            <div><strong style={{ color: 'var(--text)' }}>20Ah solar power bank</strong> — £45</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
              <strong style={{ color: 'var(--green)' }}>Total: ~£110 per allotment</strong>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Connectivity options</div>
          <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--muted)' }}>
            <div><strong style={{ color: 'var(--text)' }}>WiFi (2.4GHz)</strong> — easiest, needs hotspot</div>
            <div><strong style={{ color: 'var(--text)' }}>LoRaWAN</strong> — long range, low power, ideal</div>
            <div><strong style={{ color: 'var(--text)' }}>Bluetooth LE</strong> — short range, no internet</div>
            <div><strong style={{ color: 'var(--text)' }}>4G LTE dongle</strong> — fully offline from mains</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)', fontSize: 12 }}>
              Sensor hub → MQTT → Verdara board (local)<br />
              Dashboard served over local WiFi AP.<br />
              Farmer accesses via phone browser — no app needed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
