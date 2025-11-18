
"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { AlertCircle, FileCheck, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { detectMissingDocuments, DetectMissingDocumentsInput } from "@/ai/flows/detect-missing-documents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCandidate } from "@/app/actions/client-actions";
import { ApplicationData } from "@/lib/schemas";
import { getCompanies } from "@/app/actions/company-actions";
import { CopyDocumentationLink } from "./copy-documentation-link";


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
    Applying to: ${candidate.applyingFor.join(", ") || 'N/A'}
    Submitted Documents: ${submittedDocs.join(", ") || 'None'}
  `;
}

export function DocumentationPhase({ candidateId }: { candidateId: string}) {
  const [missingDocuments, setMissingDocuments] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<ApplicationData | null>(null);
  const [isPending, startTransition] = useTransition();


  const loadData = useCallback(async () => {
    if (!candidateId) return;

    const candidateData = await getCandidate(candidateId);
    setCandidate(candidateData);
  }, [candidateId]);

  useEffect(() => {
    startTransition(() => {
        loadData();
    });
  }, [loadData]);


  const handleDetectMissing = async () => {
    if (!candidate) {
      setError("Candidate data or process configuration is not loaded yet.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setMissingDocuments(null);
    
    // We need to get the latest candidate data to see which documents were simulated as uploaded
    const latestCandidateData = await getCandidate(candidateId);
    if (!latestCandidateData) {
        setError("Could not retrieve latest candidate data.");
        setIsLoading(false);
        return;
    }

    const companies = await getCompanies();
    const activeProcess = companies[0]?.onboardingProcesses?.[0];

    const submittedDocs: string[] = [];
    if (latestCandidateData.i9) submittedDocs.push("Form I-9 (Employment Eligibility)");
    if (latestCandidateData.w4) submittedDocs.push("Form W-4 (Tax Withholding)");
    if (latestCandidateData.idCard) submittedDocs.push("Proof of Identity & Social Security");
    if (latestCandidateD