// V2 stub: naive policy AI. Replaced in Phase 2.
export class AIProvider {
  read() { return { up:false, down:false, left:false, right:false, light:false, heavy:false, special:false }; }
  isPause() { return false; }
  destroy() {}
}
