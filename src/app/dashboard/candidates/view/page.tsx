
'use client';

import { getCandidate, updateCandidateStatus, deleteCandidate, updateCandidateWithInterviewReview } from "@/app/actions/client-actions";
import { ApplicationView } from "@/components/dashboard/application-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type ApplicationData, type InterviewReviewSchema } from "@/lib/schemas";
import { Briefcase, Printer, UserCheck, UserSearch, MessageSquare, UserX, FileText, ChevronLeft, FileUp, Loader2, AlertCircle, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { InterviewReviewForm } from "@/components/dashboard/interview-review-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressTracker } from "@/components/dashboard/progress-tracker";
import { DocumentationPhase } from "@/components/dashboard/documentation-phase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { detectMissingDocuments, DetectMissingDocumentsInput } from "@/ai/flows/detect-missing-documents";
import { getCompanies } from "@/app/actions/company-actions";
import { CopyDocumentationLink } from "@/components/dashboard/copy-documentation-link";


function buildCandidateProfile(candidate: ApplicationData | null): string {
  if (!candidate) return "No candidate data available.";
  
  const submittedDocs: string[] = [];
  if (candidate.resume) submittedDocs.push("Resume/CV");
  if (candidate.applicationPdfUrl) submittedDocs.push("Application Form");
  if (candidate.driversLicense) submittedDocs.push("Driver's License");
  if (candidate.idCard) submittedDocs.push("Proof of Identity / ID Card");
  if (candidate.proofOfAddress) submittedDocs.push("Proof of Address");
  if (candidate.i9) submittedDocs.push("I-9 Form");
  if (candidate.w4) submittedDocs.push("W-4 Form");
  if (candidate.educationalDiplomas) submittedDocs.push("Educational Diplomas");
  candidate.documents?.forEach(d => submittedDocs.push(d.title));


  return `
    Name: ${candidate.firstName} ${candidate.lastName}
    Position Applying For: ${candidate.position}
    Applying to: ${candidate.applyingFor.join(", ")}
    Submitted Documents: ${submittedDocs.join(", ") || 'None'}
  `;
}


function ApplicationViewContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const candidateId = searchParams.get('id');
    const { toast } = useToast();

    const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("application");
    const [isInterviewSubmitted, setIsInterviewSubmitted] = useState(false);

    // State for Hire Confirmation Dialog
    const [isHireConfirmOpen, setIsHireConfirmOpen] = useState(false);
    const [isCheckingDocs, setIsCheckingDocs] = useState(false);
    const [docsCheckResult, setDocsCheckResult] = useState<string[] | null>(null);


    const loadData = useCallback(async () => {
        if (candidateId) {
            setLoading(true);
            const data = await getCandidate(candidateId);
            setApplicationData(data);
            if (data?.interviewReview) {
                setIsInterviewSubmitted(true);
            } else {
                setIsInterviewSubmitted(false);
            }
            
            // Set initial tab based on data
            if (data?.status === 'new-hire' || data?.status === 'employee' || data?.status === 'inactive') {
                setActiveTab("documentation");
            } else if (data?.status === 'interview') {
                setActiveTab("interview");
            } else {
                setActiveTab("application");
            }

            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [candidateId]);


    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAction = async (action: () => Promise<any>, successCallback: () => void, errorTitle: string) => {
        try {
            const result = await action();
            if (result.success) {
                successCallback();
            } else {
                toast({ variant: "destructive", title: errorTitle, description: result.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: errorTitle, description: (error as Error).message });
        }
    };

    const handleSetToInterview = (id: string) => {
        handleAction(
            () => updateCandidateStatus(id, 'interview'),
            () => {
                toast({ title: "Candidate Updated", description: "Moved to interview phase."});
                loadData();
            },
            "Error setting to interview"
        );
    }

    const handleRejectCandidate = (id: string) => {
        const confirmed = window.confirm("Are you sure you want to reject this candidate? This will permanently delete their application.");
        if (confirmed) {
            handleAction(
                () => deleteCandidate(id),
                () => {
                    toast({ title: "Candidate Rejected", description: `An email has been simulated to ${applicationData?.firstName} informing them of the decision.`});
                    router.push('/dashboard/candidates');
                },
                "Error rejecting candidate"
            );
        }
    }
    
    const handleInterviewSubmit = async (reviewData: InterviewReviewSchema) => {
        if (!candidateId) return;

        await handleAction(
            () => updateCandidateWithInterviewReview(candidateId, reviewData),
            async () => {
                toast({ title: "Interview Reviewed", description: "You can now proceed to the documentation phase." });
                await loadData();
                setActiveTab("documentation");
            },
            "Error saving interview review"
        );
    }

    const handleCheckDocsForHire = async () => {
        if (!applicationData) return;
        setIsCheckingDocs(true);
        setDocsCheckResult(null);

        // This is the key: get the latest data which includes the simulated uploads
        const latestCandidateData = await getCandidate(applicationData.id);
        if (!latestCandidateData) {
            setIsCheckingDocs(false);
            toast({ variant: "destructive", title: "Error", description: "Could not re-fetch candidate data."});
            return;
        }

        const companies = await getCompanies();
        const activeProcess = companies[0]?.onboardingProcesses?.[0];
        
        // Build the submitted docs list based on the latest data
        const submittedDocs: string[] = [];
        if (latestCandidateData.i9) submittedDocs.push("Form I-9 (Employment Eligibility)");
        if (latestCandidateData.w4) submittedDocs.push("Form W-4 (Tax Withholding)");
        if (latestCandidateData.idCard) submittedDocs.push("Proof of Identity & Social Security");
        if (latestCandidateData.educationalDiplomas) submittedDocs.push("Educational Diplomas or Certificates");

        const input: DetectMissingDocumentsInput = {
          candidateProfile: buildCandidateProfile(latestCandidateData),
          onboardingPhase: "Detailed Documentation",
          submittedDocuments: submittedDocs,
          requiredDocuments: activeProcess?.requiredDocs || [],
        };
        
        try {
            const result = await detectMissingDocuments(input);
            setDocsCheckResult(result.missingDocuments);
        } catch (e) {
            console.error(e);
            // In case of AI error, assume docs might be missing
            setDocsCheckResult(["AI check failed, please verify manually."]);
        } finally {
            setIsCheckingDocs(false);
            setIsHireConfirmOpen(true);
        }
    };


    const handleConfirmHire = (id: string) => {
        handleAction(
            () => updateCandidateStatus(id, 'new-hire'),
            () => {
                toast({ title: "Candidate Approved!", description: "Moved to New Hire phase." });
                setIsHireConfirmOpen(false);
                router.push('/dashboard/new-hires');
            },
            "Error marking as new hire"
        );
    }

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <UserSearch className="h-12 w-12 text-muted-foreground animate-pulse" />
            </div>
        );
    }
    
    if (!candidateId || !applicationData) {
        return (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <UserSearch className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="font-headline text-2xl mt-4">No Application Data Found</CardTitle>
                        <CardDescription>
                            Could not find application data. The link may be invalid or the candidate was deleted.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/candidates">Back to Candidates</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const isCandidatePhase = applicationData.status === 'candidate';
    const isInterviewPhase = applicationData.status === 'interview';
    const isDocumentationPhase = ['new-hire', 'employee', 'inactive'].includes(applicationData.status!);
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                     <Button variant="ghost" asChild>
                        <Link href="/dashboard/candidates"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Candidates</Link>
                    </Button>
                    <h1 className="text-3xl font-headline font-bold text-foreground">
                        {applicationData.firstName} {applicationData.lastName}
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    {isCandidatePhase && (
                        <>
                            <Button variant="destructive" onClick={() => handleRejectCandidate(applicationData.id)}>
                                <UserX className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                            <Button onClick={() => handleSetToInterview(applicationData.id)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Set to Interview
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <ProgressTracker candidateId={candidateId} status={applicationData.status || 'candidate'} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="application"><FileText className="mr-2 h-4 w-4"/> Original Application</TabsTrigger>
                    { (isInterviewPhase || isDocumentationPhase || isInterviewSubmitted) && (
                        <TabsTrigger value="interview"><MessageSquare className="mr-2 h-4 w-4"/> Interview Review</TabsTrigger>
                    )}
                    { (isDocumentationPhase || isInterviewSubmitted) && (
                        <TabsTrigger value="documentation"><FileUp className="mr-2 h-4 w-4" /> Documentation</TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="application">
                    <ApplicationView data={applicationData} />
                </TabsContent>
                
                <TabsContent value="interview">
                    { (isInterviewPhase || isDocumentationPhase || isInterviewSubmitted) && (
                        <InterviewReviewForm 
                            candidateName={`${applicationData.firstName} ${applicationData.lastName}`} 
                            onReviewSubmit={handleInterviewSubmit}
                            isAlreadySubmitted={isInterviewSubmitted}
                            reviewData={applicationData.interviewReview}
                        />
                    )}
                </TabsContent>
                
                <TabsContent value="documentation">
                    { (isDocumentationPhase || isInterviewSubmitted) && (
                        <div className="space-y-4">
                            <DocumentationPhase candidateId={candidateId} />
                            <div className="flex justify-end pt-4 gap-2">
                                <Button onClick={handleCheckDocsForHire} disabled={applicationData.status !== 'interview' || isCheckingDocs}>
                                    {isCheckingDocs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                    Mark as New Hire
                                </Button>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <AlertDialog open={isHireConfirmOpen} onOpenChange={setIsHireConfirmOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm New Hire</AlertDialogTitle>
                        {docsCheckResult && docsCheckResult.length > 0 ? (
                            <AlertDialogDescription>
                                <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5"/>
                                        <div>
                                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Warning: Missing Documents</h3>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                                The AI check suggests the following documents might be missing:
                                            </p>
                                            <ul className="list-disc pl-5 mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                                                {docsCheckResult.map((doc, i) => <li key={i}>{doc}</li>)}
                                            </ul>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-3">
                                                Are you sure you want to proceed with hiring?
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </AlertDialogDescription>
                        ) : (
                             <AlertDialogDescription>
                                All required documents appear to be submitted. Are you sure you want to mark {applicationData.firstName} as a new hire?
                            </AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleConfirmHire(applicationData.id)}>
                            Yes, Mark as New Hire
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function ApplicationViewPage() {
    return (
        <Suspense fallback={<div className="flex flex-1 items-center justify-center"><UserSearch className="h-12 w-12 text-muted-foreground animate-pulse" /></div>}>
            <ApplicationViewContent />
        </Suspense>
    )
}
