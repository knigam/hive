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
  x: number
  y: number
}
export interface Piece {
  id: PieceId
  color: Color
  type: PieceType
  position: BoardPosition | undefined
  stack: number | undefined
}
export interface PlayerState {
  creator: PlayerName
  color: Color
  selectedPiece: Piece | undefined
  validMoves: BoardPosition[]
  unplayedPieces: Piece[]
  boardPieces: Piece[]
  currentPlayerTurn: Color
  players: PlayerName[]
  status: GameStatus
}
export interface PlayerData {
  playerName: PlayerName
}
export interface ICreateGameRequest {
}
export interface IJoinGameRequest {
}
export interface IStartGameRequest {
  pieces: Piece[];
  color: Color | undefined;
}
export interface ISelectPieceRequest {
  piece: Piece;
}
export interface IMovePieceRequest {
  piece: Piece;
  position: BoardPosition;
}
