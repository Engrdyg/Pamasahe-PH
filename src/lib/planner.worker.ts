/// <reference lib="webworker" />
// Builds the route network once and answers plan requests off the main thread.
import type { Mode } from '../engine'
import { buildNetwork, plan, slim, type Network, type RouteFile } from './planner'

let net: Network | null = null
let modes: Record<string, Mode> = {}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  try {
    if (msg.type === 'init') {
      modes = msg.modes
      const file = (await (await fetch(msg.url)).json()) as RouteFile
      net = buildNetwork(file, modes)
      self.postMessage({ type: 'ready', routes: file.routes.length })
    } else if (msg.type === 'plan' && net) {
      self.postMessage({ type: 'result', id: msg.id, itineraries: plan(net, modes, msg.a, msg.b).map(slim) })
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String(err) })
  }
}
