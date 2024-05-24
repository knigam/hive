export type PlayerName = string;
export type PieceId = number;
export enum PieceType {
  QUEEN,
  ANT,
  SPIDER,
  GRASSHOPPER,
  BEETLE,
  LADYBUG,
  MOSQUITO,
  PILLBUG,
}
export enum Color {
  WHITE,
  BLACK,
}
export enum GameStatus {
  NOT_STARTED,
  IN_PROGRESS,
  DRAW,
  WHITE_WON,
  BLACK_WON,
}
export interface BoardPosition {
  x: number;
  y: number;
}
export interface Piece {
  id: PieceId;
  color: Color;
  type: PieceType;
  position: BoardPosition | undefined;
  stack: number | undefined;
}
export interface Move {
  color: Color;
  piece: Piece;
  movedFrom: BoardPosition | undefined;
  movedTo: BoardPosition;
}
export interface PlayerState {
  isCreator: boolean;
  creatorColor: Color | undefined;
  tournament: boolean;
  color: Color;
  selectedPiece: Piece | undefined;
  lastMove: Move | undefined;
  validMoves: BoardPosition[];
  unplayedPieces: Piece[];
  boardPieces: Piece[];
  currentPlayerTurn: Color;
  players: PlayerName[];
  status: GameStatus;
}
export interface ISetupGameRequest {
  whitePieces: PieceType[];
  blackPieces: PieceType[];
  creatorColor: Color | undefined;
  tournament: boolean | undefined;
}
export interface ISelectPieceRequest {
  pieceId: PieceId | undefined;
}
export interface IMovePieceRequest {
  pieceId: PieceId;
  position: BoardPosition;
}
export enum Method {
  SETUP_GAME,
  PLAY_GAME,
  SELECT_PIECE,
  MOVE_PIECE,
}
export interface AnonymousUserData {
  type: "anonymous";
  id: string;
  name: string;
}
export interface GoogleUserData {
  type: "google";
  id: string;
  name: string;
  email: string;
  locale: string;
  picture: string;
}
export type UserData = AnonymousUserData | GoogleUserData;