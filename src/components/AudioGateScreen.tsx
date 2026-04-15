interface AudioGateScreenProps {
  onUnlock: () => void;
}

export default function AudioGateScreen({ onUnlock }: AudioGateScreenProps) {
  return (
    <div className="audio-gate" onClick={onUnlock}>
      <div className="audio-gate__title">BATTLE<span>SHIP</span></div>
      <div className="audio-gate__message">CLICK ANYWHERE TO ENABLE AUDIO</div>
      <div className="audio-gate__sub">And begin your mission</div>
      <div className="audio-gate__prompt">▶ CLICK TO CONTINUE ◀</div>
    </div>
  );
}
