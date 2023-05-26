import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionConfirmationStrategy } from '@solana/web3.js'
import type { NextApiRequest, NextApiResponse } from 'next'
//import * as base58 from "base-58";
const bs58 = require('bs58')

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
  const label = 'rb_test';
  const icon = 'https://exiledapes.academy/wp-content/uploads/2021/09/X_share.png';

  res.status(200).send({
    label,
    icon,
  });
}

const MERCHANT_WALLETx="[15,41,248,101,51,93,10,145,18,180,179,203,110,67,247,121,249,86,221,197,175,42,40,31,21,249,202,105,184,22,209,238,195,24,155,199,39,38,52,137,158,189,10,169,5,240,155,21,156,46,147,183,42,7,40,52,40,158,230,90,155,20,17,150]"

async function post(
  req: NextApiRequest,
  res: NextApiResponse<PostData>
) {
  // Account provided in the transaction request body by the wallet.
  const accountField = req.body?.account;
  if (!accountField) throw new Error('missing account');

  const sender = new PublicKey(accountField);
  const MERCHANT_WALLET = new PublicKey(MERCHANT_WALLETx);

  // Build Transaction
  const ix = SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: new PublicKey("FKu3Uctz9DMzXbdirfAvyWUbHWLKckr3f7whZpfrmSxM"),
    lamports: 9999999,
  })

  let transaction = new Transaction();
  transaction.add(ix);

  const connection = new Connection("https://api.devnet.solana.com")
  const bh = await connection.getLatestBlockhash();
  transaction.recentBlockhash = bh.blockhash;
  transaction.feePayer = MERCHANT_WALLET.PublicKey;

  // for correct account ordering 
  transaction = Transaction.from(transaction.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  }));

  transaction.sign(MERCHANT_WALLET);
  console.log(base58.encode(transaction.signature));

  // Serialize and return the unsigned transaction.
  const serializedTransaction = transaction.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });

  const base64Transaction = serializedTransaction.toString('base64');
  const message = 'Thank you for using rbPay';

  res.status(200).send({ transaction: base64Transaction, message });

}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetData | PostData>
) {
  if (req.method == "GET") {
    console.log("received GET request");
    return get(req, res);
  } else if (req.method == "POST") {
    console.log("received POST request");
    return await post('req', 'res');
  }
}

  {/*
export default function handler(req, res) {
    res.status(200).json({ name: 'John Doe' })
  }
}*/}