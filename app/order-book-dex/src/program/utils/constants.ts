import { PublicKey } from "@solana/web3.js";
import idl from "../idl/idl.json";

export const PROGRAM_ID = new PublicKey(idl.address);
export const CHRONO_IDL = JSON.parse(JSON.stringify(idl));
