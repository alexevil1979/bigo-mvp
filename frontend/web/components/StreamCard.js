import Link from 'next/link';

export default function StreamCard({ stream }) {
  return (
    <Link href={`/stream/${stream._id}`}>
      <div className="stream-card">
        <div className="stream-thumbnail">
          {/* Здесь будет превью стрима */}
          <div className="live-badge">LIVE</div>
        </div>
        <div className="stream-info">
          <h3>{stream.title}</h3>
          <p className="streamer-name">{stream.streamer?.nickname}</p>
          <p className="viewer-count">👁️ {stream.viewerCount} зрителей</p>
        </div>
      </div>
    </Link>
  );
}

