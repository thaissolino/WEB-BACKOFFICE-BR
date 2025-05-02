import React, { useEffect, useRef, useState } from "react";
import { IoArrowBack, IoCamera } from "react-icons/io5"; // Ícones
import { Html5Qrcode } from "html5-qrcode"; // Biblioteca de QR Code

interface BilletCamProps {
  handleClose: () => void;
}

const ScannBillsBackoffice = ({ handleClose }: BilletCamProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [scannedData, setScannedData] = useState<any | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startQRScanner = () => {
    const config = {
      fps: 20,
      aspectRatio: 1.777,
      facingMode: { exact: "environment" },
    };

    const html5QrCode = new Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Stop the scanner once data is captured
          html5QrCode.stop();
          processScannedData(decodedText); // Process the scanned data
        },
        (error) => {
          console.error("Erro ao ler o código de barras:", error);
        }
      )
      .catch((err) => {
        console.error("Erro ao acessar a câmera:", err);
        setError("Erro ao acessar a câmera. Tente novamente.");
      });
  };

  // Process the scanned data (barcode)
  const processScannedData = (barCode: string) => {
    // Example of extracting data from the barcode
    const barcodeDetails = {
      barCode: barCode.replace(/[\s,-,/]/g, ""),
      dueDate: "2023-05-30", // Example of extracted data
      amount: 150.75, // Example of extracted data
      bank: "Banco Example", // Example of extracted data
    };

    // Save the scanned data in localStorage
    localStorage.setItem("scannedBilletData", JSON.stringify(barcodeDetails));

    // Set state to display in modal
    setScannedData(barcodeDetails);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Erro ao parar o scanner:", err);
      }
    }
  };

  useEffect(() => {
    startQRScanner(); // Start the scanner when component is mounted
    return () => {
      stopScanner(); // Cleanup the scanner when the component is unmounted
    };
  }, []);

  return (
    <div style={{ position: "relative", padding: "20px" }}>
      {/* Seta de Voltar */}
      <button
        onClick={handleClose}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "transparent",
          border: "none",
          color: "#004A8A",
          fontSize: "24px",
        }}
      >
        <IoArrowBack />
      </button>

      {/* Camera and Scan Instruction */}
      <div
        style={{
          position: "absolute",
          top: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "#fff",
          zIndex: 1600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <IoCamera style={{ fontSize: "24px" }} />
        <p style={{ fontSize: "16px", fontWeight: "500" }}>
          Aponte a câmera para a linha digitável para realizar o registro dos dados do boleto.
        </p>
      </div>

      {/* Scanner */}
      <div
        id="reader"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          minHeight: "150%",
          minWidth: "150%",
          backgroundImage: "linear-gradient(to right, #ff9500, #ff6600, #ff3300)",
          zIndex: 1300,
        }}
      ></div>

      {/* Modal for Scanned Data */}
      {scannedData && (
        <div
          style={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            zIndex: 1400,
          }}
        >
          <h3>Dados do Boleto</h3>
          <p><strong>Código de Barras:</strong> {scannedData.barCode}</p>
          <p><strong>Vencimento:</strong> {scannedData.dueDate}</p>
          <p><strong>Valor:</strong> R$ {scannedData.amount}</p>
          <p><strong>Banco:</strong> {scannedData.bank}</p>
          <button onClick={handleClose} className="px-4 py-2 bg-red-600 text-white rounded-md">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
};

export default ScannBillsBackoffice;
