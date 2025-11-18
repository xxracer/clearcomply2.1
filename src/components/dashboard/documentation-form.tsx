

"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, FileText, Download } from "lucide-react"
import { z } from "zod"


import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { updateCandidateWithDocuments } from "@/app/actions/client-actions"
import Link from "next/link"
import { Checkbox } from "../ui/checkbox"


// Statically define the required documents
const requiredDocs = [
  { id: 'i9', label: 'Form I-9 (Employment Eligibility)', officialLink: 'https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf' },
  { id: 'w4', label: 'Form W-4 (Tax Withholding)', officialLink: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf' },
  { id: 'proofOfIdentity', label: 'Proof of Identity & Social Security', officialLink: null },
  { id: 'educationalDiplomas', label: 'Educational Diplomas or Certificates', officialLink: null },
];

// Create a dynamic schema based on the required docs
const documentationSchemaObject = requiredDocs.reduce((acc, doc) => {
  acc[doc.id as keyof typeof acc] = z.boolean().default(false);
  return acc;
}, {} as Record<string, z.ZodBoolean>);

const documentationSchema = z.object(documentationSchemaObject);

type DocumentationSchema = z.infer<typeof documentationSchema>;


export function DocumentationForm({ companyName, candidateId }: { companyName: string, candidateId?: string | null }) {
    const { toast } = useToast()
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<DocumentationSchema>({
        resolver: zodResolver(documentationSchema),
    });

    async function onSubmit(data: DocumentationSchema) {
        if (!candidateId) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No candidate ID found. This link may be invalid.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // This is a simulation. We'll just record which documents were checked.
            // The "true" value will just be a placeholder string.
            const documentsToUpload: Record<string, string> = {};
            
            if (data.i9) documentsToUpload['i9'] = "submitted";
            if (data.w4) documentsToUpload['w4'] = "submitted";
            if (data.proofOfIdentity) documentsToUpload['idCard'] = "submitted";
            if (data.educationalDiplomas) documentsToUpload['educationalDiplomas'] = "submitted";
            
            const result = await updateCandidateWithDocuments(
                candidateId, 
                documentsToUpload
            );

            if (result.success) {
                toast({
                  title: "Documents Submitted",
                  description: "Your document submission has been recorded.",
                });
                router.push('/documentation/success');
            } else {
                toast({
                  variant: "destructive",
                  title: "Submission Failed",
                  description: result.error || "An unknown error occurred.",
                });
            }
        } catch (error) {
            toast({
              variant: "destructive",
              title: "Submission Failed",
              description: (error as Error).message || "An unexpected error occurred.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardContent className="pt-6 space-y-6">
                {requiredDocs.map(doc => (
                    <FormField
                        key={doc.id}
                        control={form.control}
                        name={doc.id as keyof DocumentationSchema}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                               <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none w-full">
                                     <FormLabel className="font-semibold">{doc.label}</FormLabel>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {doc.officialLink ? (
                                                <FormDescription>
                                                    Download the official form, fill it out, save it, and then upload it here.
                                                    <Button variant="link" asChild className="p-1 h-auto ml-1">
                                                        <Link href={doc.officialLink} target="_blank" rel="noopener noreferrer">
                                                            <Download className="mr-1 h-3 w-3" />
                                                            Download {doc.label}
                                                        </Link>
                                                    </Button>
                                                </FormDescription>
                                            ) : (
                                                <FormDescription>Upload a scan or photo of your document.</FormDescription>
                                            )}
                                        </div>
                                        <Button type="button" variant="secondary" size="sm" disabled>Upload Document</Button>
                                    </div>
                                </div>
                            </FormItem>
                        )}
                    />
                ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Documents
          </Button>
        </div>
      </form>
    </Form>
  )
}
