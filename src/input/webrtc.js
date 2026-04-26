// V2 stub: WebRTC + QR signaling lockstep. Replaced in Phase 2.
export class WebRTCProvider {
  read() { return { up:false, down:false, left:false, right:false, light:false, heavy:false, special:false }; }
  isPause() { return false; }
  destroy() {}
}
