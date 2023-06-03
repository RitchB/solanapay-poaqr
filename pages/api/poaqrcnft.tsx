import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionConfirmationStrategy } from '@solana/web3.js'
import {PROGRAM_ID as BUBBLEGUM_PROGRAM_ID, createMintToCollectionV1Instruction, TokenProgramVersion} from "@metaplex-foundation/mpl-bubblegum";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, ValidDepthSizePair, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  } from "@metaplex-foundation/mpl-token-metadata";
import type { NextApiRequest, NextApiResponse } from 'next'

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

    console.log("mint reqest by "+accountField);

    const user = new PublicKey(accountField);

    const authority = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.AUTHORITY_KEY)),
    ); // tree and collection authority
    
    const tree = new PublicKey("7DvCv53peihpqtbDLV8uhVRtmeY3of9pNRpBGXoEWSqn");

    // Build Transaction
    const ix = await createMintCNFTInstruction(tree, user, authority.publicKey);


    let transaction = new Transaction();
    transaction.add(ix);

    const connection = new Connection(process.env.RPC_PROVIDER);
    const bh = await connection.getLatestBlockhash();
    transaction.recentBlockhash = bh.blockhash;
    transaction.feePayer = user; 
    
    // for correct account ordering 
    transaction = Transaction.from(transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    }));

    transaction.sign(authority);
    console.log(transaction)


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
  res: NextApiResponse<GetData|PostData>
) {
  if(req.method == "GET"){
    return get(req, res);
  } else if(req.method == "POST"){
    return await post(req, res);
  }
}



async function createMintCNFTInstruction(merkleTree: PublicKey, account: PublicKey, authority: PublicKey) {

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
        [merkleTree.toBuffer()],
        BUBBLEGUM_PROGRAM_ID,
      );
      
    const collectionMint = new PublicKey("3XfkDtSZZ586DztsjeVpTV3TLMYHRci2tkwTBoGzFvfz")
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
        treeAuthority: treeAuthority,
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
            collection: {key:collectionMint, verified: false},
            creators: [],
            isMutable: true,
            name: "First",
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