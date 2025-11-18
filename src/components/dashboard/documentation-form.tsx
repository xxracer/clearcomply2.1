
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, File as FileIcon, FileText, Download } from "lucide-react"
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


// Statically define the required documents
const requiredDocs = [
  { id: 'i9', label: 'Form I-9 (Employment Eligibility)', officialLink: 'https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf' },
  { id: 'w4', label: 'Form W-4 (Tax Withholding)', officialLink: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf' },
  { id: 'proofOfIdentity', label: 'Proof of Identity & Social Security', officialLink: null },
  { id: 'educationalDiplomas', label: 'Educational Diplomas or Certificates', officialLink: null },
];

const documentationSchema = z.object({
  i9: z.any().refine((file): file is File => file instanceof File, "Form I-9 is required."),
  w4: z.any().refine((file): file is File => file instanceof File, "Form W-4 is required."),
  proofOfIdentity: z.any().refine((file): file is File => file instanceof File, "Proof of Identity is required."),
  educationalDiplomas: z.any().refine((file): file is File => file instanceof File, "Diplomas or Certificates are required."),
});
type DocumentationSchema = z.infer<typeof documentationSchema>;

// Helper to convert a File to a base64 data URI
async function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


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
            const documentsToUpload: Record<string, string> = {};
            
            for (const doc of requiredDocs) {
                const file = data[doc.id as keyof typeof data];
                if (file instanceof File) {
                    const dataUrl = await fileToDataURL(file);
                    // Map specific IDs to the correct field names in ApplicationData
                    const key = doc.id === 'proofOfIdentity' ? 'idCard' : doc.id;
                    documentsToUpload[key] = dataUrl;
                }
            }

            const result = await updateCandidateWithDocuments(
                candidateId, 
                documentsToUpload
            );

            if (result.success) {
                toast({
                  title: "Documents Submitted",
                  description: "Candidate documents have been uploaded.",
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
                {requiredDocs.map(doc => {
                    return (
                        <div key={doc.id}>
                            <Controller
                                control={form.control}
                                name={doc.id as keyof DocumentationSchema}
                                render={({ field: { onChange, ...fieldProps }, fieldState }) => {
                                    const file = form.watch(doc.id as any);
                                    return (
                                        <FormItem>
                                            <FormLabel className="font-semibold">{doc.label} <span className="text-destructive">*</span></FormLabel>
                                            {doc.officialLink && (
                                                <FormDescription>
                                                    Download the official form, fill it out, save it, and then upload it here.
                                                    <Button variant="link" asChild className="p-1 h-auto ml-1">
                                                        <Link href={doc.officialLink} target="_blank" rel="noopener noreferrer">
                                                            <Download className="mr-1 h-3 w-3" />
                                                            Download {doc.label}
                                                        </Link>
                                                    </Button>
                                                </FormDescription>
                                            )}
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                      type="file" 
                                                      accept="application/pdf,image/*" 
                                                      {...fieldProps} 
                                                      onChange={(e) => onChange(e.target.files?.[0])} 
                                                      value={undefined}
                                                      className="pr-12"
                                                    />
                                                    <FileIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                             {file instanceof File && (
                                                <FormDescription className="flex items-center gap-2 pt-1">
                                                   <FileText className="h-4 w-4 text-muted-foreground" /> {file.name}
                                                </FormDescription>
                                             )}
                                            <FormMessage />
                                        </FormItem>
                                    )
                                }}
                            />
                        </div>
                    )
                })}
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
