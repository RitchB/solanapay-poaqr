import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionConfirmationStrategy, TransactionInstruction } from '@solana/web3.js'
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID, createMintToCollectionV1Instruction, TokenProgramVersion } from "@metaplex-foundation/mpl-bubblegum";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, ValidDepthSizePair, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import type { NextApiRequest, NextApiResponse } from 'next';
import { type } from 'os';
import dotenv from "dotenv"

dotenv.config()

export type CnftInfo = {
  name: string,
  symbol?: string,
  collection?: string, //pubkey
  uri: string,
  coverFees?: boolean,
  releaseDate?: string, //date
  disabled?: boolean,
  earlyBefore?: string, //date
  lateAfter?: string, //date
  tmpuri?: string,
  image?: string, // uri
  current?: boolean
}

type GetData = {
  label: string
  icon: string
}
type PostData = {
  transaction: string,
  message?: string
}

function get(
  req: NextApiRequest,
  res: NextApiResponse<GetData>
) {
  const label = 'SolRitchB Minter';
  const icon = 'https://shdw-drive.genesysgo.net/BBayKe9v2acgiM6LpEio9dA1nxHHg2S6UsYrZuTVxZZL/POA_rb_test.png';

  res.status(200).send({
    label,
    icon,
  });
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<PostData>
) {
  // Account provided in the transaction request body by the wallet.
  const accountField = req.body?.account;
  if (!accountField) throw new Error('missing account');

  console.log("mint reqest by " + accountField);

  const user = new PublicKey(accountField);

  {/* 
  const secret = JSON.parse(process.env.SECRET_KEY ?? "") as number[]
  const secretKey = Uint8Array.from(secret)
  const authority = Keypair.fromSecretKey(secretKey)
*/}


  const authority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse("[15,41,248,101,51,93,10,145,18,180,179,203,110,67,247,121,249,86,221,197,175,42,40,31,21,249,202,105,184,22,209,238,195,24,155,199,39,38,52,137,158,189,10,169,5,240,155,21,156,46,147,183,42,7,40,52,40,158,230,90,155,20,17,150]")),
  ); // tree and collection authority

  //const tree = new PublicKey("7DvCv53peihpqtbDLV8uhVRtmeY3of9pNRpBGXoEWSqn");
  const tree = new PublicKey("ERkzt2Zyau5nnSf877FCQNzQRRxW5xaMJEt4DQhYX97T");

  // Build Transaction
  const ix = await createMintCNFTInstruction(tree, user, authority.publicKey);


  let transaction = new Transaction();
  transaction.add(ix);

  const connection = new Connection("https://api.devnet.solana.com");
  const bh = await connection.getLatestBlockhash();
  transaction.recentBlockhash = bh.blockhash;
  transaction.feePayer = user;

  // for correct account ordering 
  transaction = Transaction.from(transaction.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  }));

  transaction.sign(authority.publicKey);
  console.log('authority qui est dans le transaction.sign', authority)
  console.log('transaction', transaction)


  // Serialize and return the unsigned transaction.
  const serializedTransaction = transaction.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });

  const base64Transaction = serializedTransaction.toString('base64');
  const message = 'Thank you for minting with SolRitchB!';


  res.status(200).send({ transaction: base64Transaction, message });

}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetData | PostData>
) {
  if (req.method == "GET") {
    return get(req, res);
  } else if (req.method == "POST") {
    return await post(req, res);
  }
}



async function createMintCNFTInstruction(merkleTree: PublicKey, account: PublicKey, authority: PublicKey) {

  const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );
  
  console.log('[treeAuthority, _bump]', [treeAuthority, _bump])
  console.log('treeAuthority', treeAuthority.toBase58())
  console.log('_bump', _bump)
  console.log('merkleTree', merkleTree.toBase58())

  const collectionMint = new PublicKey("3XfkDtSZZ586DztsjeVpTV3TLMYHRci2tkwTBoGzFvfz")
  console.log('collectionMint', collectionMint.toBase58())

  const [collectionMetadataAccount, _b1] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata", "utf8"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  const [collectionEditionAccount, _b2] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata", "utf8"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
      Buffer.from("edition", "utf8"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  const [bgumSigner, __] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection_cpi", "utf8")],
    BUBBLEGUM_PROGRAM_ID
  );
  const ix = await createMintToCollectionV1Instruction({
    treeAuthority: authority,
    leafOwner: account,
    leafDelegate: account,
    merkleTree: merkleTree,
    payer: account,
    treeDelegate: authority,
    logWrapper: SPL_NOOP_PROGRAM_ID,
    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    collectionAuthority: authority,
    collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
    collectionMint: collectionMint,
    collectionMetadata: collectionMetadataAccount,
    editionAccount: collectionEditionAccount,
    bubblegumSigner: bgumSigner,
    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  }, {
    metadataArgs: {
      collection: { key: collectionMint, verified: false },
      creators: [],
      isMutable: true,
      name: "cnf test by rb",
      primarySaleHappened: true,
      sellerFeeBasisPoints: 0,
      symbol: "CAS",
      uri: "https://shdw-drive.genesysgo.net/BBayKe9v2acgiM6LpEio9dA1nxHHg2S6UsYrZuTVxZZL/cNFTrb_metadata.json",
      uses: null,
      tokenStandard: null,
      editionNonce: null,
      tokenProgramVersion: TokenProgramVersion.Original
    }
  });

  return ix;
}