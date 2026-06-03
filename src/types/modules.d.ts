declare module 'plantuml-encoder' {
  const encoder: {
    encode(text: string): string
    decode(text: string): string
  }
  export default encoder
}
