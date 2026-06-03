/** File System Access API（フォルダ参照）が利用可能なブラウザかを判定する。 */
export function is_fsa_supported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}
