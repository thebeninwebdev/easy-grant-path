import { notFound } from "next/navigation";
import { getAdminProposalContext } from "@/lib/proposals";
import { ProposalTemplateEditor } from "@/components/admin/proposals/proposal-template-editor";
export const instant = false;
export default async function AdminProposalPage({ params }: { params: Promise<{ id: string }> }) { const context = await getAdminProposalContext((await params).id); if (!context) notFound(); return <ProposalTemplateEditor context={context} />; }
