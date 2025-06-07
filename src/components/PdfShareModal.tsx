// src/components/PdfShareModal.tsx

import React, { useEffect, useState, Fragment } from "react";
import { Dialog, Transition, Listbox } from "@headlessui/react";
import { api } from "../services/api";
import { CheckIcon, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";

interface PdfShareModalProps {
  onClose: () => void;
  generatePDF: () => void;
}

const PdfShareModal: React.FC<PdfShareModalProps> = ({ onClose, generatePDF }) => {
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");

  // Carregar usuários reais da API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");

        if (!token) {
          console.error("Token não encontrado!");
          return;
        }

        const response = await api.get("/graphic", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userNames = response.data.map((item: any) => item.userName);
        setUsers(userNames);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };

    fetchUsers();
  }, []);

  // Handlers
  const handleDownload = () => {
    console.log("Chamando generatePDF...");
    generatePDF();
  };

  const handleSendToPWA = async () => {
    if (!selectedUser) {
      console.error("Nenhum usuário selecionado.");
      return;
    }

    try {
      console.log("Gerando PDF...");

      const doc = new jsPDF();
      doc.text("Relatório PDF gerado para usuário: " + selectedUser, 10, 10);

      const pdfBase64 = doc.output("datauristring").split(",")[1]; // só base64 puro

      console.log("PDF gerado, enviando para backend...");

      const token = localStorage.getItem("@backoffice:token");

      if (!token) {
        console.error("Token não encontrado!");
        return;
      }

      const response = await api.post(
        "/api/send-report-to-user",
        {
          targetUserName: selectedUser,
          pdfBase64,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Resposta do backend:", response);
    } catch (error: any) {
      console.error("Erro ao enviar PDF para backend:", error?.response?.status, error?.response?.data);
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSendEmail = () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Por favor, digite um e-mail.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError("E-mail inválido. Verifique e tente novamente.");
      return;
    }

    setEmailError(""); // limpa erro se ok

    console.log("Enviando PDF para e-mail:", trimmedEmail);

    // Aqui você pode chamar sua API de envio de e-mail (exemplo):
    // await api.post("/enviar-pdf-email", { email: trimmedEmail, pdfData: ... });
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white px-6 pb-6 pt-8 text-left shadow-xl transition-all space-y-6">
                {/* Botão Fechar (ESC já funciona também) */}
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl">
                  &times;
                </button>

                {/* Modal Title */}
                <Dialog.Title as="h3" className="text-2xl font-semibold text-gray-800 text-center">
                  Compartilhar PDF
                </Dialog.Title>
                <p className="text-sm text-gray-500 text-center ">Selecione apenas 1 opção para envio</p>
                {/* Botão 1: Baixar PDF */}
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition text-lg font-medium"
                >
                  <i className="fa-solid fa-download"></i>
                  Baixar PDF
                </button>

                {/* Select (Listbox) de Usuários */}
                <div className="space-y-2">
                  <label className="block text-gray-700 text-sm font-medium">
                    Selecione um usuário para enviar via BR-PWA:
                  </label>
                  <Listbox value={selectedUser} onChange={setSelectedUser}>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-default rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base">
                        <span className="block truncate">
                          {selectedUser ? selectedUser.toUpperCase() : "-- Selecione o usuário --"}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {users.map((userName) => (
                            <Listbox.Option
                              key={userName}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                                  active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                                }`
                              }
                              value={userName}
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                                    {userName.toUpperCase()}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>

                {/* Botão 2: Enviar para BR-PWA */}
                <button
                  onClick={handleSendToPWA}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 transition text-lg font-medium"
                >
                  <i className="fa-solid fa-paper-plane"></i>
                  Enviar PDF para BR-PWA
                </button>

                {/* Input: Digitar E-mail */}
                <div className="space-y-2">
                  <label className="block text-gray-700 text-sm font-medium">Digite um e-mail para enviar:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@dominio.com"
                    className={`w-full border rounded-xl p-3 text-gray-700 text-base shadow-sm focus:outline-none focus:ring-2 ${
                      emailError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                    }`}
                  />
                  {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
                </div>

                {/* Botão 3: Enviar por E-mail */}
                <button
                  onClick={handleSendEmail}
                  className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white py-3 px-4 rounded-xl hover:bg-purple-600 transition text-lg font-medium"
                >
                  <i className="fa-solid fa-envelope"></i>
                  Enviar via E-mail
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default PdfShareModal;
