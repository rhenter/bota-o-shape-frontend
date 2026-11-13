"use client";

import { useParams } from "next/navigation";

import { InvoiceDetail } from "@/components/invoice-detail";

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const invoiceId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <InvoiceDetail invoiceId={invoiceId} />;
}
