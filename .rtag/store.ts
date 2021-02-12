import { watch } from "fs";
import module from "module";
import onChange from "on-change";
import { PlayerData, PlayerState } from "./types";

const require = module.createRequire(import.meta.url);
let impl = new (await import("../impl")).Impl();
watch(require.resolve("../impl"), async () => {
  impl = new (await import(`../impl.ts#${Math.random()}`)).Impl();
});

type StateId = string;
type State = ReturnType<typeof impl.createGame>;
const states: Map<StateId, State> = new Map();
const changedStates: Set<StateId> = new Set();
const subscriptions: Map<StateId, Set<PlayerData>> = new Map();

export default class Store {
  constructor(onNewUserState: (stateId: StateId, userData: PlayerData, userState: PlayerState) => void) {
    setInterval(() => {
      changedStates.forEach((stateId) => {
        subscriptions
          .get(stateId)!
          .forEach((userData) => onNewUserState(stateId, userData, impl.getUserState(states.get(stateId)!, userData)));
      });
      changedStates.clear();
    }, 50);
  }
  newState(stateId: StateId, userData: PlayerData, req: any) {
    const state = impl.createGame(userData, req);
    states.set(
      stateId,
      onChange(state, () => {
        changedStates.add(stateId);
      })
    );
  }
  handleUpdate(stateId: StateId, userData: PlayerData, method: string, args: any) {
    const state = states.get(stateId)!;
    switch (method) {
      case "joinGame":
        return impl.joinGame(state, userData, args);
      case "startGame":
        return impl.startGame(state, userData, args);
      case "selectPiece":
        return impl.selectPiece(state, userData, args);
      case "movePiece":
        return impl.movePiece(state, userData, args);
    }
    return "Invalid method";
  }
  hasState(stateId: StateId) {
    return states.has(stateId);
  }
  getUserState(stateId: StateId, userData: PlayerData) {
    const state = states.get(stateId);
    return state !== undefined ? impl.getUserState(state, userData) : undefined;
  }
  subscribeUser(stateId: StateId, userData: PlayerData) {
    if (!subscriptions.has(stateId)) {
      subscriptions.set(stateId, new Set([userData]));
    } else {
      subscriptions.get(stateId)!.add(userData);
    }
  }
  unsubscribeUser(stateId: StateId, userData: PlayerData) {
    const users = subscriptions.get(stateId)!;
    if (users.size > 1) {
      users.delete(userData);
    } else {
      subscriptions.delete(stateId);
    }
  }
}
