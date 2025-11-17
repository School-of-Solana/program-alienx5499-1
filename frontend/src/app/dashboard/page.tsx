'use client';

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plane, ShieldCheck, Clock, FileText, Plus, ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { Navbar1 } from "@/components/ui/navbar-1";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import bs58 from "bs58";
import idlJson from "@/idl/zyura.json";
import { motion, AnimatePresence } from "framer-motion";

// Import new components
import { PolicyCard } from "@/components/dashboard/PolicyCard";
import { SkeletonCard } from "@/components/dashboard/SkeletonCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FormField } from "@/components/dashboard/FormField";
import { ProductStatsCard } from "@/components/dashboard/ProductStatsCard";
import { PolicyModal } from "@/components/dashboard/PolicyModal";
import { InteractiveTutorial } from "@/components/dashboard/InteractiveTutorial";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Card, CardContent } from "@/components/ui/card";

// Constants
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || "4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // Form state
  const [flightNumber, setFlightNumber] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [productId, setProductId] = useState("");
  const [pnr, setPnr] = useState("");

  // UI state
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);

  // Data state
  const [products, setProducts] = useState<Array<{ id: string }>>([]);
  const [selectedProductInfo, setSelectedProductInfo] = useState<any | null>(null);
  const [myPolicies, setMyPolicies] = useState<any[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyModalData, setPolicyModalData] = useState<any>(null);
  const [fetchedPassenger, setFetchedPassenger] = useState<any | null>(null);
  const [isFetchingPnr, setIsFetchingPnr] = useState(false);
  const [pnrStatus, setPnrStatus] = useState<"fetching" | "found" | "not-found" | null>(null);
  const [activeSection, setActiveSection] = useState<string>("dashboard");

  // Time options for departure time selector
  const timeOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const value = `${hh}:${mm}`;
        const date = new Date();
        date.setHours(h, m, 0, 0);
        const label = date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch policies when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchMyPolicies();
    } else {
      setMyPolicies([]);
    }
  }, [connected, publicKey]);

  // Scroll spy to track active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['dashboard', 'buy', 'policies'];
      const scrollPosition = window.scrollY + 150; // Offset for navbar

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section) {
          const offsetTop = section.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle hash navigation on mount and when navigating from other pages
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['dashboard', 'buy', 'policies'].includes(hash)) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const offset = 120; // Navbar height + padding
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          setActiveSection(hash);
        }
      }, 300); // Wait for page to render
    }
  }, []);

  // Listen for hash changes (e.g., browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['dashboard', 'buy', 'policies'].includes(hash)) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            const offset = 120;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            setActiveSection(hash);
          }
        }, 100);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Auto-fetch PNR data when user enters 6-character PNR
  useEffect(() => {
    if (!pnr || pnr.length !== 6) {
      setFetchedPassenger(null);
      setPnrStatus(null);
      return;
    }

    const fetchPnrData = async () => {
      setIsFetchingPnr(true);
      setPnrStatus("fetching");
      try {
        const response = await fetch(`/api/zyura/pnr/search?pnr=${encodeURIComponent(pnr)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.flight_number) setFlightNumber(data.flight_number);
          if (data.date) setDepartureDate(data.date);
          if (data.scheduled_departure_unix) {
            const depDate = new Date(data.scheduled_departure_unix * 1000);
            const hours = String(depDate.getUTCHours()).padStart(2, "0");
            const minutes = String(depDate.getUTCMinutes()).padStart(2, "0");
            setDepartureTime(`${hours}:${minutes}`);
          }
          if (data.passenger) {
            setFetchedPassenger(data.passenger);
          }
          setPnrStatus("found");
          toast.success("PNR found! Details auto-filled.");
        } else {
          setPnrStatus("not-found");
        }
      } catch (error) {
        console.error("Error fetching PNR:", error);
        setPnrStatus("not-found");
      } finally {
        setIsFetchingPnr(false);
      }
    };

    fetchPnrData();
  }, [pnr]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const disc = coder.accounts.accountDiscriminator("Product");
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } },
        ],
      });
      const items: Array<{ id: string }> = [];
      for (const acc of accounts) {
        try {
          const decoded: any = coder.accounts.decode("Product", acc.account.data);
          const idBn: anchor.BN | undefined = decoded.productId || decoded.product_id || decoded.id;
          const id = idBn ? new BN(idBn.toString()).toString() : undefined;
          if (id) {
            items.push({ id });
          }
        } catch (_) {
          // skip decode errors
        }
      }
      const unique = Array.from(new Set(items.map(i => i.id))).sort((a, b) => Number(a) - Number(b));
      const mapped = unique.map(id => ({ id }));
      setProducts(mapped);
      if (!productId && mapped.length > 0) {
        const firstId = mapped[0].id;
        setProductId(firstId);
        try { await showProductById(firstId); } catch { }
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch products", { description: e.message });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchMyPolicies = async () => {
    try {
      setIsLoadingPolicies(true);
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const disc = coder.accounts.accountDiscriminator("Policy");
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } },
        ],
      });
      const userPubkeyStr = publicKey?.toString();
      if (!userPubkeyStr) {
        setMyPolicies([]);
        return;
      }
      const items: any[] = [];
      for (const acc of accounts) {
        try {
          const decoded: any = coder.accounts.decode("Policy", acc.account.data);
          let policyholderStr: string | null = null;
          try {
            if (decoded.policyholder) {
              const policyholderPk = new PublicKey(decoded.policyholder);
              policyholderStr = policyholderPk.toString();
            }
          } catch (e) {
            policyholderStr = decoded.policyholder?.toString?.() || null;
          }
          if (policyholderStr === userPubkeyStr) {
            items.push(decoded);
          }
        } catch (_) { /* ignore */ }
      }
      items.sort((a, b) => Number((b.created_at ?? 0).toString()) - Number((a.created_at ?? 0).toString()));
      setMyPolicies(items);
    } catch (e) {
      console.error("Error fetching policies:", e);
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  const showProductById = async (id: string) => {
    try {
      const idNum = parseInt(id, 10);
      if (Number.isNaN(idNum)) return;
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const [productPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("product"), new BN(idNum).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      const info = await connection.getAccountInfo(productPda);
      if (!info) {
        toast.error("Product account not found");
        return;
      }
      const decoded: any = coder.accounts.decode("Product", info.data);
      setSelectedProductInfo(decoded);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load product", { description: e.message });
    }
  };

  const handleBuy = async () => {
    if (!pnr || !flightNumber || !departureDate || !departureTime || !productId) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (pnr.length !== 6) {
      toast.error("PNR must be exactly 6 characters");
      return;
    }

    if (!connected || !publicKey || !signTransaction || !sendTransaction) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsSubmitting(true);
    try {
      const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
      const departureDateTime = new Date(`${departureDate}T${departureTime}:00Z`);
      const departureUnix = Math.floor(departureDateTime.getTime() / 1000);
      const departureTimeBn = new BN(departureUnix);
      const policyId = Math.floor(Date.now() / 1000) % 1000000;

      const productInfoAcc = await connection.getAccountInfo(
        PublicKey.findProgramAddressSync(
          [Buffer.from("product"), new BN(parseInt(productId, 10)).toArrayLike(Buffer, "le", 8)],
          PROGRAM_ID
        )[0]
      );
      if (!productInfoAcc) {
        throw new Error("Selected product not found");
      }
      const decodedProduct: any = coder.accounts.decode("Product", productInfoAcc.data);
      const coverageAmount6dp = new BN((decodedProduct.coverage_amount as any).toString());
      const premiumRateBps: number = Number((decodedProduct.premium_rate_bps as any).toString());
      const premiumAmount = coverageAmount6dp.mul(new BN(premiumRateBps)).div(new BN(10_000));

      toast.info("Preparing metadata and assets...");

      // Load and customize SVG template
      const svgResponse = await fetch("/zyura-nft-insurance.svg");
      let svg = await svgResponse.text();
      const departureIso = new Date(departureDateTime.getTime()).toISOString();

      const premiumUsd = (Number(premiumAmount.toString()) / 1_000_000).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const coverageUsd = (Number(coverageAmount6dp.toString()) / 1_000_000).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      svg = svg
        .replaceAll("[FLIGHT_NUMBER]", flightNumber)
        .replaceAll("[POLICY_ID]", policyId.toString())
        .replaceAll("[PRODUCT_ID]", productId)
        .replaceAll("[DEPARTURE_ISO]", departureIso)
        .replaceAll("[PREMIUM_6DP]", premiumUsd)
        .replaceAll("[COVERAGE_6DP]", coverageUsd)
        .replaceAll("[PNR]", pnr || "[PNR]");

      // Upload SVG
      const svgFilename = `${publicKey.toString()}/${policyId}/policy.svg`;
      const svgUploadResponse = await fetch("/api/github/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: svg,
          filePath: svgFilename,
          message: `Add SVG image for ZYURA Policy ${policyId}`,
        }),
      });

      if (!svgUploadResponse.ok) {
        const error = await svgUploadResponse.json();
        throw new Error(`Failed to upload SVG: ${error.error || "Unknown error"}`);
      }

      const { url: svgUrl } = await svgUploadResponse.json();

      // Create metadata
      const metadata = {
        name: `ZYURA Policy ${policyId} ${flightNumber}`,
        symbol: "ZYURA",
        image: svgUrl,
        attributes: [
          { trait_type: "Product ID", value: productId },
          { trait_type: "Policy ID", value: policyId.toString() },
          { trait_type: "Flight", value: flightNumber },
          { trait_type: "PNR", value: pnr || "N/A" },
          { trait_type: "Departure", value: departureIso },
          { trait_type: "Premium (6dp)", value: premiumAmount.toString() },
          { trait_type: "Wallet Address", value: publicKey.toString() },
        ],
      };

      // Upload metadata
      const metadataFilename = `${publicKey.toString()}/${policyId}/policy.json`;
      const metadataUploadResponse = await fetch("/api/github/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify(metadata, null, 2),
          filePath: metadataFilename,
          message: `Add/update metadata for ZYURA Policy ${policyId}`,
        }),
      });

      if (!metadataUploadResponse.ok) {
        const error = await metadataUploadResponse.json();
        throw new Error(`Failed to upload metadata: ${error.error || "Unknown error"}`);
      }

      const { url: metadataUri } = await metadataUploadResponse.json();

      toast.info("Building transaction...");

      // Derive PDAs
      const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
      const [productPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("product"), new BN(parseInt(productId, 10)).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      const [policyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("policy"), new BN(policyId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );

      // Get config account
      const configAccountInfo = await connection.getAccountInfo(configPda);
      if (!configAccountInfo) {
        throw new Error("Protocol not initialized. Please contact support.");
      }

      let decodedConfig: any;
      try {
        decodedConfig = coder.accounts.decode("Config", configAccountInfo.data);
      } catch (err: any) {
        if (err.message?.includes("discriminator") || err.message?.includes("Invalid account discriminator")) {
          const dataWithoutDiscriminator = configAccountInfo.data.slice(8);
          const adminBytes = dataWithoutDiscriminator.slice(0, 32);
          const usdcMintBytes = dataWithoutDiscriminator.slice(32, 64);
          const switchboardProgramBytes = dataWithoutDiscriminator.slice(64, 96);
          const paused = dataWithoutDiscriminator[96] === 1;
          const bump = dataWithoutDiscriminator[97];
          decodedConfig = {
            admin: new PublicKey(adminBytes).toString(),
            usdc_mint: new PublicKey(usdcMintBytes).toString(),
            switchboard_program: new PublicKey(switchboardProgramBytes).toString(),
            paused: paused,
            bump: bump,
          };
        } else {
          throw err;
        }
      }

      const adminPubkey = new PublicKey(decodedConfig.admin);
      const userUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const riskPoolVault = getAssociatedTokenAddressSync(USDC_MINT, adminPubkey);
      const policyNftMint = Keypair.generate();
      const userPolicyNftAta = getAssociatedTokenAddressSync(policyNftMint.publicKey, publicKey);

      // Metadata accounts
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          policyNftMint.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          policyNftMint.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("policy_mint_authority")],
        PROGRAM_ID
      );

      // Build instruction
      const data = coder.instruction.encode("purchase_policy", {
        policy_id: new BN(policyId),
        flight_number: flightNumber,
        departure_time: departureTimeBn,
        premium_amount: premiumAmount,
        create_metadata: true,
        metadata_uri: metadataUri,
      } as any);

      const keys = [
        { pubkey: configPda, isWritable: true, isSigner: false },
        { pubkey: productPda, isWritable: true, isSigner: false },
        { pubkey: policyPda, isWritable: true, isSigner: false },
        { pubkey: riskPoolVault, isWritable: true, isSigner: false },
        { pubkey: userUsdcAccount, isWritable: true, isSigner: false },
        { pubkey: publicKey, isWritable: true, isSigner: true },
        { pubkey: policyNftMint.publicKey, isWritable: true, isSigner: true },
        { pubkey: userPolicyNftAta, isWritable: true, isSigner: false },
        { pubkey: metadataAccount, isWritable: true, isSigner: false },
        { pubkey: masterEditionAccount, isWritable: true, isSigner: false },
        { pubkey: TOKEN_METADATA_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: mintAuthority, isWritable: false, isSigner: false },
        {
          pubkey: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          isWritable: false,
          isSigner: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      ];

      const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      tx.partialSign(policyNftMint);

      toast.info("Please sign the transaction in your wallet");

      const signedTx = await signTransaction(tx);
      const expectedSignature = signedTx.signatures?.[0]?.signature
        ? bs58.encode(Buffer.from(signedTx.signatures[0].signature))
        : undefined;

      const serializedTx = signedTx.serialize({
        requireAllSignatures: true,
        verifySignatures: false,
      });

      toast.info("Sending transaction...");

      let signature: string;
      try {
        signature = await connection.sendRawTransaction(serializedTx, {
          skipPreflight: false,
          maxRetries: 3,
        });
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes("already been processed") && expectedSignature) {
          signature = expectedSignature;
        } else {
          throw e;
        }
      }

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setLastTxSig(signature);

      toast.success("Insurance purchased successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...${signature.slice(-8)}`
      });

      // Reset form
      setFlightNumber("");
      setDepartureDate("");
      setDepartureTime("");
      setPnr("");
      setProductId("");
      setFetchedPassenger(null);
      setPnrStatus(null);
      setShowBuyForm(false);

      // Refresh policies
      fetchMyPolicies();
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error("Purchase failed", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPolicyModal = async (policy: any) => {
    const toNum = (v: any) => Number((v ?? 0).toString());
    const policyId = toNum(policy.id);
    const productIdAttr = toNum(policy.product_id);
    const dep = toNum(policy.departure_time);
    const premium6 = toNum(policy.premium_paid);
    const coverage6 = toNum(policy.coverage_amount);

    let status = 'Unknown';
    if (policy.status) {
      if (policy.status.Active !== undefined || policy.status.active !== undefined) {
        status = 'Active';
      } else if (policy.status.PaidOut !== undefined || policy.status.paidOut !== undefined || policy.status.paid_out !== undefined) {
        status = 'PaidOut';
      } else if (policy.status.Expired !== undefined || policy.status.expired !== undefined) {
        status = 'Expired';
      } else if (typeof policy.status === 'string') {
        status = policy.status;
      } else {
        const keys = Object.keys(policy.status);
        if (keys.length > 0) {
          status = keys[0];
        }
      }
    }

    const departureIso = new Date(dep * 1000).toISOString();
    const premiumUsd = (premium6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const coverageUsd = (coverage6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const ep = connection.rpcEndpoint || '';
    const cluster = ep.includes('devnet') ? 'devnet' : (ep.includes('testnet') ? 'testnet' : 'mainnet');
    const explorerUrl = `https://explorer.solana.com/address/${publicKey?.toString()}?cluster=${cluster}`;

    // Try to fetch NFT metadata and image
    let imageUrl: string | undefined;
    let metadataUrl: string | undefined;

    // Generate expected URLs based on GitHub structure (with /metadata/ folder)
    const expectedSvgUrl = `https://raw.githubusercontent.com/alienx5499/zyura-nft-metadata/main/metadata/${publicKey?.toString()}/${policyId}/policy.svg`;
    const expectedJsonUrl = `https://raw.githubusercontent.com/alienx5499/zyura-nft-metadata/main/metadata/${publicKey?.toString()}/${policyId}/policy.json`;

    try {
      // Try to fetch the metadata JSON
      const metadataResponse = await fetch(expectedJsonUrl);
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        imageUrl = metadata.image || expectedSvgUrl;
        metadataUrl = expectedJsonUrl;
        console.log('✅ NFT metadata loaded:', expectedJsonUrl);
      } else {
        // Fallback to expected SVG URL
        imageUrl = expectedSvgUrl;
        console.log('⚠️ JSON not found, trying SVG directly:', expectedSvgUrl);
      }
    } catch (error) {
      console.log('⚠️ Could not fetch NFT metadata, using fallback:', error);
      imageUrl = expectedSvgUrl;
    }

    setPolicyModalData({
      policyId,
      productId: productIdAttr,
      status,
      flight: policy.flight_number || '',
      departureIso,
      premiumUsd,
      coverageUsd,
      explorerUrl,
      imageUrl,
      metadataUrl,
      expectedJsonUrl,
      expectedSvgUrl,
    });
    setShowPolicyModal(true);
  };

  return (
    <>
      <Navbar1 />
      <main className="min-h-screen bg-black pt-24 pb-16">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            id="dashboard"
            data-section="dashboard"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 15,
              duration: 0.6 
            }}
            className="mb-8 md:mb-12 scroll-mt-32"
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
            >
              Dashboard
            </motion.h1>
            <motion.p 
              className="text-gray-400 text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            >
              Manage your flight delay insurance policies
            </motion.p>
          </motion.div>

          {/* Last Transaction Banner */}
          <AnimatePresence mode="wait">
            {lastTxSig && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25,
                  duration: 0.4 
                }}
                className="mb-6 rounded-xl border border-dark-border-strong bg-accent-success/10 p-4 flex items-center justify-between gap-3 backdrop-blur-sm"
              >
                <motion.div 
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-accent-success"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <div>
                    <motion.p 
                      className="text-sm font-medium text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      Policy Purchased Successfully
                    </motion.p>
                    <motion.p 
                      className="text-xs text-gray-400 font-mono"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {lastTxSig.slice(0, 8)}...{lastTxSig.slice(-8)}
                    </motion.p>
                  </div>
                </motion.div>
                {(() => {
                  const ep = connection.rpcEndpoint || '';
                  const cluster = ep.includes('devnet') ? 'devnet' : (ep.includes('testnet') ? 'testnet' : 'mainnet');
                  const url = `https://explorer.solana.com/tx/${lastTxSig}?cluster=${cluster}`;
                  return (
                    <motion.a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-black hover:bg-gray-800 border border-gray-700 text-white text-sm font-medium transition-all duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      View on Explorer
                    </motion.a>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Primary Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buy Insurance Section */}
              <motion.section
                id="buy"
                data-section="buy"
                initial={{ opacity: 0, y: 30 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  borderColor: activeSection === 'buy' ? 'rgba(99, 102, 241, 0.5)' : undefined
                }}
                transition={{ 
                  delay: 0.1,
                  type: "spring", 
                  stiffness: 100, 
                  damping: 15 
                }}
                className="relative rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-3xl md:p-3 scroll-mt-32"
              >
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <Card className="relative overflow-hidden rounded-xl border-[0.75px] border-gray-800 bg-black">
                  <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <motion.div 
                      className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center"
                      whileHover={{ 
                        scale: 1.1, 
                        rotate: [0, -5, 5, -5, 0],
                        transition: { duration: 0.5 }
                      }}
                    >
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    </motion.div>
                    <h2 className="text-2xl font-semibold text-white">Buy Insurance</h2>
                  </motion.div>
                  <motion.button
                    onClick={() => setShowBuyForm((s) => !s)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${showBuyForm
                        ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    {showBuyForm ? (
                      <>
                        <motion.span
                          animate={{ rotate: 180 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-4 h-4 inline" />
                        </motion.span>
                        Hide Form
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 inline" />
                        Buy Policy
                      </>
                    )}
                  </motion.button>
                </div>

                <AnimatePresence>
                  {!connected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3"
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, -10, 10, -10, 0],
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                      >
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-medium text-white">Wallet Not Connected</p>
                        <p className="text-xs text-gray-300 mt-1">
                          Connect your wallet to purchase insurance policies.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {showBuyForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, scale: 0.98 }}
                      animate={{ height: "auto", opacity: 1, scale: 1 }}
                      exit={{ height: 0, opacity: 0, scale: 0.98 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 30,
                        mass: 0.8
                      }}
                      className="overflow-hidden"
                    >
                      <motion.div 
                        className="space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          delay: 0.15,
                          type: "spring",
                          stiffness: 300,
                          damping: 25
                        }}
                      >
                        {/* Form Fields */}
                        <motion.div 
                          className="space-y-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Product Selection */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-white">
                                Product *
                              </label>
                              <select
                                value={productId}
                                onChange={async (e) => {
                                  const v = e.target.value;
                                  setProductId(v);
                                  if (v) await showProductById(v);
                                }}
                                disabled={!connected || isSubmitting || isLoadingProducts}
                                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                              >
                                <option value="" disabled>
                                  {products.length ? 'Select a product' : 'Loading...'}
                                </option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>Product {p.id}</option>
                                ))}
                              </select>
                            </div>

                            {/* PNR Field */}
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <FormField
                                label="PNR"
                                required
                                value={pnr}
                                onChange={(e) => {
                                  setPnr(e.target.value.toUpperCase());
                                  if (e.target.value.length !== 6) {
                                    setPnrStatus(null);
                                    setFetchedPassenger(null);
                                  }
                                }}
                                placeholder="6-character code"
                                disabled={!connected || isSubmitting}
                                className={pnrStatus === "fetching" ? "relative" : ""}
                                helperText={
                                  pnrStatus === "fetching" ? (
                                    <motion.span
                                      className="flex items-center gap-2 text-indigo-400"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                    >
                                      <motion.div
                                        className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      />
                                      Fetching PNR details...
                                    </motion.span>
                                  ) : pnrStatus === "found" ? (
                                    <motion.span
                                      className="flex items-center gap-2 text-emerald-400"
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ type: "spring", stiffness: 300 }}
                                    >
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                                      >
                                        ✓
                                      </motion.div>
                                      PNR found, details auto-filled
                                    </motion.span>
                                  ) : pnrStatus === "not-found" ? (
                                    <span className="text-amber-400">PNR not found, enter manually</span>
                                  ) : (
                                    "Enter your 6-character PNR for auto-fill"
                                  ) as React.ReactNode
                                }
                              />
                            </motion.div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ 
                                opacity: 1, 
                                x: 0,
                                scale: pnrStatus === "found" ? [1, 1.02, 1] : 1
                              }}
                              transition={{ 
                                delay: 0.25,
                                scale: pnrStatus === "found" ? {
                                  duration: 0.6,
                                  times: [0, 0.5, 1]
                                } : {}
                              }}
                            >
                              <FormField
                                label="Flight Number"
                                required
                                value={flightNumber}
                                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                                placeholder="e.g., AI202, AP986"
                                disabled={!connected || isSubmitting || pnrStatus === "found"}
                                showLockIcon={pnrStatus === "found"}
                                className={pnrStatus === "found" ? "border-2 border-amber-500/50 shadow-[0_0_0_2px_rgba(251,191,36,0.2)]" : ""}
                              />
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ 
                                opacity: 1, 
                                x: 0,
                                scale: pnrStatus === "found" ? [1, 1.02, 1] : 1
                              }}
                              transition={{ 
                                delay: 0.3,
                                scale: pnrStatus === "found" ? {
                                  duration: 0.6,
                                  times: [0, 0.5, 1]
                                } : {}
                              }}
                            >
                              <FormField
                                label="Departure Date"
                                required
                                type="date"
                                value={departureDate}
                                onChange={(e) => setDepartureDate(e.target.value)}
                                disabled={!connected || isSubmitting || pnrStatus === "found"}
                                showLockIcon={pnrStatus === "found"}
                                className={pnrStatus === "found" ? "border-2 border-amber-500/50 shadow-[0_0_0_2px_rgba(251,191,36,0.2)]" : ""}
                              />
                            </motion.div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <motion.div
                              className="space-y-2"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ 
                                opacity: 1, 
                                y: 0,
                                scale: pnrStatus === "found" ? [1, 1.02, 1] : 1
                              }}
                              transition={{ 
                                delay: 0.35,
                                scale: pnrStatus === "found" ? {
                                  duration: 0.6,
                                  times: [0, 0.5, 1]
                                } : {}
                              }}
                            >
                              <label className="block text-sm font-medium text-white">
                                Departure Time *
                              </label>
                              <div className="relative">
                                <select
                                  value={departureTime}
                                  onChange={(e) => setDepartureTime(e.target.value)}
                                  disabled={!connected || isSubmitting || pnrStatus === "found"}
                                  className={`w-full px-4 py-2.5 bg-black border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all ${
                                    pnrStatus === "found" 
                                      ? "border-2 border-amber-500/50 shadow-[0_0_0_2px_rgba(251,191,36,0.2)] pr-10 appearance-none" 
                                      : "border border-gray-700 disabled:opacity-50"
                                  }`}
                                >
                                  <option value="" disabled>Select time</option>
                                  {timeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                {pnrStatus === "found" && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>

                        {/* Passenger Info (if PNR found) */}
                        <AnimatePresence>
                          {fetchedPassenger && pnrStatus === "found" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, scale: 0.9, y: -20 }}
                              animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, scale: 0.9, y: -20 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 400, 
                                damping: 30,
                                mass: 0.8
                              }}
                              className="rounded-lg border border-accent-success/20 bg-accent-success/5 p-4 relative overflow-hidden"
                            >
                              {/* Animated background glow */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  repeatDelay: 1,
                                  ease: "easeInOut"
                                }}
                              />
                              <motion.h4 
                                className="text-sm font-semibold text-white mb-3 flex items-center gap-2 relative z-10"
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ 
                                  delay: 0.2,
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 20
                                }}
                              >
                                <motion.div
                                  animate={{ 
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                  }}
                                  transition={{ 
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                  className="w-4 h-4 relative z-10"
                                >
                                  <img 
                                    src="/logo.svg" 
                                    alt="ZYURA" 
                                    className="w-full h-full object-contain"
                                  />
                                </motion.div>
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                  className="relative z-10"
                                >
                                  Passenger Details (Auto-filled)
                                </motion.span>
                              </motion.h4>
                              <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm relative z-10"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                              >
                                <motion.div
                                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  transition={{ 
                                    delay: 0.4,
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20
                                  }}
                                  className="relative"
                                >
                                  <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-gray-400"
                                  >
                                    Name:
                                  </motion.span>
                                  {' '}
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ 
                                      delay: 0.6,
                                      type: "spring",
                                      stiffness: 400
                                    }}
                                    className="text-white font-medium"
                                  >
                                    {fetchedPassenger.fullName || fetchedPassenger.full_name || 'N/A'}
                                  </motion.span>
                                </motion.div>
                                {fetchedPassenger.email && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{ 
                                      delay: 0.45,
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 20
                                    }}
                                    className="relative"
                                  >
                                    <motion.span
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.55 }}
                                      className="text-gray-400"
                                    >
                                      Email:
                                    </motion.span>
                                    {' '}
                                    <motion.span
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ 
                                        delay: 0.65,
                                        type: "spring",
                                        stiffness: 400
                                      }}
                                      className="text-white font-medium"
                                    >
                                      {fetchedPassenger.email}
                                    </motion.span>
                                  </motion.div>
                                )}
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.div 
                          className="flex justify-end pt-4 border-t border-dark-border"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <motion.button
                            onClick={handleBuy}
                            disabled={!productId || !flightNumber || !departureDate || !departureTime || isSubmitting || !connected}
                            className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 flex items-center"
                            whileHover={!isSubmitting && !(!productId || !flightNumber || !departureDate || !departureTime || !connected) ? { 
                              scale: 1.05,
                              boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)"
                            } : {}}
                            whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                          >
                            {isSubmitting ? (
                              <>
                                <motion.div 
                                  className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                Processing...
                              </>
                            ) : (
                              <>
                                <motion.span
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  Purchase Insurance
                                </motion.span>
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {!showBuyForm && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-gray-400 text-sm"
                    >
                      Protect your flight with instant, automated delay insurance. Click "Buy Policy" to get started.
                    </motion.p>
                  )}
                </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.section>

              {/* My Policies Section */}
              <motion.section
                id="policies"
                data-section="policies"
                initial={{ opacity: 0, y: 30 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  borderColor: activeSection === 'policies' ? 'rgba(16, 185, 129, 0.5)' : undefined
                }}
                transition={{ 
                  delay: 0.2,
                  type: "spring", 
                  stiffness: 100, 
                  damping: 15 
                }}
                className="relative rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-3xl md:p-3 scroll-mt-32"
              >
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <Card className="relative overflow-hidden rounded-xl border-[0.75px] border-gray-800 bg-black">
                  <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <motion.div 
                    className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"
                    whileHover={{ 
                      scale: 1.1, 
                      rotate: [0, -5, 5, -5, 0],
                      transition: { duration: 0.5 }
                    }}
                  >
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                  <h2 className="text-2xl font-semibold text-white">My Policies</h2>
                  <AnimatePresence>
                    {myPolicies.length > 0 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="ml-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/30"
                      >
                        {myPolicies.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {!connected ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="Connect Your Wallet"
                    description="Connect your wallet to view your insurance policies"
                  />
                ) : isLoadingPolicies ? (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <SkeletonCard />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : myPolicies.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No Policies Yet"
                    description="Purchase your first flight delay insurance policy to get started"
                    action={{
                      label: "Buy Policy",
                      onClick: () => setShowBuyForm(true)
                    }}
                  />
                ) : (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                  >
                    {myPolicies.map((p, index) => {
                      const toNum = (v: any) => Number((v ?? 0).toString());
                      const policyId = toNum(p.id);
                      const productIdAttr = toNum(p.product_id);
                      const dep = toNum(p.departure_time);
                      const premium6 = toNum(p.premium_paid);
                      const coverage6 = toNum(p.coverage_amount);

                      let status: 'Active' | 'PaidOut' | 'Expired' = 'Active';
                      if (p.status) {
                        if (p.status.Active !== undefined || p.status.active !== undefined) {
                          status = 'Active';
                        } else if (p.status.PaidOut !== undefined || p.status.paidOut !== undefined || p.status.paid_out !== undefined) {
                          status = 'PaidOut';
                        } else if (p.status.Expired !== undefined || p.status.expired !== undefined) {
                          status = 'Expired';
                        } else if (typeof p.status === 'string') {
                          const statusStr = p.status as string;
                          if (statusStr.toLowerCase().includes('active')) status = 'Active';
                          else if (statusStr.toLowerCase().includes('paid')) status = 'PaidOut';
                          else if (statusStr.toLowerCase().includes('expired')) status = 'Expired';
                        } else {
                          const keys = Object.keys(p.status);
                          if (keys.length > 0) {
                            const key = keys[0];
                            if (key.toLowerCase().includes('active')) status = 'Active';
                            else if (key.toLowerCase().includes('paid')) status = 'PaidOut';
                            else if (key.toLowerCase().includes('expired')) status = 'Expired';
                          }
                        }
                      }

                      const departureIso = new Date(dep * 1000).toISOString();
                      const premiumUsd = (premium6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                      const coverageUsd = (coverage6 / 1_000_000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

                      const ep = connection.rpcEndpoint || '';
                      const cluster = ep.includes('devnet') ? 'devnet' : (ep.includes('testnet') ? 'testnet' : 'mainnet');
                      const explorerUrl = `https://explorer.solana.com/address/${publicKey?.toString()}?cluster=${cluster}`;

                      return (
                        <motion.div
                          key={policyId}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ 
                            delay: index * 0.1,
                            type: "spring", 
                            stiffness: 200, 
                            damping: 20 
                          }}
                          whileHover={{ y: -4 }}
                        >
                          <PolicyCard
                            policyId={policyId}
                            status={status}
                            productId={productIdAttr}
                            flight={p.flight_number || ''}
                            departureIso={departureIso}
                            premiumUsd={premiumUsd}
                            coverageUsd={coverageUsd}
                            explorerUrl={explorerUrl}
                            onOpen={() => openPolicyModal(p)}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
                  </CardContent>
                </Card>
              </motion.section>
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Product Details Card */}
              <AnimatePresence mode="wait">
                {selectedProductInfo && (
                  <motion.div
                    key="product-card"
                    data-tutorial="product-details"
                    initial={{ opacity: 0, x: 30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 30, scale: 0.95 }}
                    transition={{ 
                      delay: 0.3,
                      type: "spring", 
                      stiffness: 200, 
                      damping: 20 
                    }}
                    whileHover={{ y: -2 }}
                  >
                    <ProductStatsCard productInfo={selectedProductInfo} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info Card */}
              <motion.div
                data-tutorial="how-it-works"
                initial={{ opacity: 0, x: 30, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ 
                  delay: 0.4,
                  type: "spring", 
                  stiffness: 100, 
                  damping: 15 
                }}
                className="relative rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-3xl md:p-3"
              >
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <Card className="relative overflow-hidden rounded-xl border-[0.75px] border-gray-800 bg-black">
                  <CardContent className="p-6">
                <motion.h4 
                  className="text-lg font-semibold text-white mb-3 flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.span 
                    className="w-1 h-5 bg-blue-500 rounded-full"
                    animate={{ 
                      height: [20, 24, 20],
                      opacity: [1, 0.8, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  How It Works
                </motion.h4>
                <motion.ul 
                  className="space-y-3 text-sm text-gray-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[
                    "Select an insurance product and enter your flight details",
                    "Pay the premium in USDC through your connected wallet",
                    "Receive a policy NFT as proof of your coverage",
                    "Get automatic USDC payouts if your flight is delayed beyond the threshold"
                  ].map((text, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + index * 0.1 }}
                      whileHover={{ x: 5, transition: { duration: 0.2 } }}
                    >
                      <motion.span 
                        className="text-indigo-400 mt-1 font-semibold"
                        whileHover={{ scale: 1.2 }}
                      >
                        {index + 1}.
                      </motion.span>
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </motion.ul>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Policy Modal */}
      <PolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        data={policyModalData}
      />

      {/* Interactive Tutorial */}
      <InteractiveTutorial 
        formHandlers={{
          setShowBuyForm,
          setPnr,
          setFlightNumber,
          setDepartureDate,
          setDepartureTime,
          setProductId,
          clearForm: () => {
            setPnr('');
            setFlightNumber('');
            setDepartureDate('');
            setDepartureTime('');
            setFetchedPassenger(null);
            setPnrStatus(null);
          },
        }}
      />
    </>
  );
}

