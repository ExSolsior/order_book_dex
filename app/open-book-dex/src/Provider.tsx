import {
    useMemo,
    ReactNode,
    type FC,
} from 'react'
// import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    ConnectionProvider,
    WalletProvider,
} from '@solana/wallet-adapter-react';
import {
    UnsafeBurnerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';

import './App.css'

export interface Props {
    children: ReactNode;
}

const Provider: FC<{
    children: ReactNode;
}> = ({ children }) => {

    // const network = WalletAdapterNetwork.mainnet;
    const network = 'http://localhost.com:8899'
    const wallets = useMemo(
        () => [

            new UnsafeBurnerWalletAdapter(),
        ],
        []
    );

    return (
        <>
            <ConnectionProvider endpoint={network}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>
                        <WalletMultiButton />
                        <WalletDisconnectButton />
                        {children}
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </>
    )
}

export default Provider;
