// Ambient types for simple-peer-light (drop-in fork of simple-peer)
// This keeps our existing SimplePeer typings working.

declare module "simple-peer-light" {
  import SimplePeer from "simple-peer";
  export default SimplePeer;
}
