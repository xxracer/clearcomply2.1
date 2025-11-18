
'use client';

import { ApplicationForm } from "@/components/dashboard/application-form";
import { getCompanies } from "@/app/actions/company-actions";
import Image from "next/image";
import { Company, OnboardingProcess } from "@/lib/company-schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getFile } from "../actions/kv-actions";
import { AiGeneratedForm } from "@/components/dashboard/ai-generated-form";

function ApplicationContent() {
  const searchParams = useSearchParams();
  const processId = searchParams.get('processId');

  const [company, setCompany] = useState<Partial<Company> | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [process, setProcess] = useState<Partial<OnboardingProcess> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanyAndProcess = async () => {
        setLoading(true);
        const companies = await getCompanies();
        let foundCompany: Company | null = null;
        let foundProcess: OnboardingProcess | null = null;

        if (processId) {
            for (const c of companies) {
                const p = c.onboardingProcesses?.find(p => p.id === processId);
                if (p) {
                    foundCompany = c;
                    foundProcess = p;
                    break;
                }
            }
        } 
        
        if (!foundCompany && companies.length > 0) {
            foundCompany = companies[0];
            // For generic link, try to find a default process or fall back
            foundProcess = foundCompany.onboardingProcesses?.find(p => p.applicationForm?.type === 'template') || foundCompany.onboardingProcesses?.[0] || null;
        }
        
        setCompany(foundCompany);
        setProcess(foundProcess);

        if (foundCompany?.logo) {
            try {
                const url = await getFile(foundCompany.logo);
                setLogoUrl(url);
            } catch (e) {
                console.error("Failed to load company logo:", e);
                setLogoUrl(null);
            }
        } else {
            setLogoUrl(null);
        }

        setLoading(false);
    }
    loadCompanyAndProcess();
  }, [processId]);

  if (loading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!company) {
     return (
        <div className="flex min-h-screen flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-bold">No Company Configured</h1>
            <p className="text-muted-foreground">This application portal has not been set up yet.</p>
        </div>
     )
  }

  const applicationForm = process?.applicationForm;
  const isTemplateForm = !applicationForm || applicationForm.type === 'template';
  const isAiForm = applicationForm?.type === 'custom' && (applicationForm.fields?.length || 0) > 0;
  const isImageForm = applicationForm?.type === 'custom' && (applicationForm.images?.length || 0) > 0;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex flex-col items-center">
            {logoUrl && (
              <Image
                  src={logoUrl}
                  alt={`${company.name || 'Company'} Logo`}
                  width={150}
                  height={50}
                  className="mb-4 object-contain"
                  data-ai-hint="company logo"
              />
            )}
          <h1 className="font-headline text-3xl font-bold text-center">
            Candidate Application for {company.name}
            {process?.name && <span className="block text-xl text-muted-foreground mt-1">({process.name})</span>}
          </h1>
          <p className="text-muted-foreground text-center">Fill out the form below to apply.</p>
        </div>
        
        {isTemplateForm ? (
            <ApplicationForm companyName={company.name || 'Default Company'} />
        ) : isAiForm ? (
            <AiGeneratedForm 
                formName={applicationForm.name} 
                fields={applicationForm.fields!}
                companyName={company.name || 'Default Company'}
            />
        ) : isImageForm ? (
             <Card>
                <CardContent className="p-2 md:p-4">
                    <Carousel className="w-full">
                        <CarouselContent>
                            {applicationForm.images!.map((url, index) => (
                                <CarouselItem key={index}>
                                    <Image
                                        src={url}
                                        alt={`Application form page ${index + 1}`}
                                        width={800}
                                        height={1100}
                                        className="w-full h-auto rounded-md object-contain"
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                     <div className="text-center text-sm text-muted-foreground p-4 border-t mt-4">
                         Since this is a custom form, please contact the company directly to submit your application.
                     </div>
                </CardContent>
            </Card>
        ) : (
             <div className="text-center py-20 text-muted-foreground">
                The application form for this company is not available at the moment.
             </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <ApplicationContent />
        </Suspense>
    )
}
