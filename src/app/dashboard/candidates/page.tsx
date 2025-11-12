
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Users, Info } from "lucide-react";
import { type ApplicationData } from "@/lib/schemas";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNewCandidates } from "@/app/actions/candidate-actions";
import { CandidatesActions } from "./_components/candidates-actions";
import { format } from "date-fns";
import { useEffect, useState, useCallback } from "react";
import { getInterviewCandidates } from "@/app/actions/client-actions";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase } from "lucide-react";

// Helper to convert string to JS Date
function toDate(dateString: string | Date | undefined): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    return new Date(dateString);
  } catch (e) {
    return null;
  }
}

function CandidatesTable({ candidates }: { candidates: ApplicationData[] }) {
    if (candidates.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">No Candidates Found</h3>
                <p className="text-sm">There are no candidates in this category.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Applying For</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {candidates.map((candidate) => {
                    const applicationDate = toDate(candidate.date);
                    return (
                      <TableRow key={candidate.id}>
                          <TableCell className="font-medium">{candidate.firstName} {candidate.lastName}</TableCell>
                          <TableCell>{candidate.applyingFor.join(', ')}</TableCell>
                          <TableCell>{applicationDate ? format(applicationDate, 'PPP') : 'N/A'}</TableCell>
                          <TableCell className="capitalize">{candidate.status}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <CandidatesActions candidateId={candidate.id} />
                          </TableCell>
                      </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    );
}

export default function CandidatesPage() {
  const [newApplicants, setNewApplicants] = useState<ApplicationData[]>([]);
  const [interviewingCandidates, setInterviewingCandidates] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [newApps, interviewing] = await Promise.all([
      getNewCandidates(),
      getInterviewCandidates(),
    ]);
    setNewApplicants(newApps);
    setInterviewingCandidates(interviewing);
    setLoading(false);

    // When this page is visited, update the seen count
    localStorage.setItem('lastSeenCandidateCount', newApps.length.toString());
    // Dispatch an event to notify the sidebar to re-check counts
    window.dispatchEvent(new Event('candidates-viewed'));

  }, []);

  useEffect(() => {
    loadData();
    // Listen for storage changes to keep data in sync across tabs
    const handleStorageChange = () => {
        loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Users className="h-12 w-12 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  if (newApplicants.length === 0 && interviewingCandidates.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-2xl font-bold tracking-tight">No Candidates Yet</h3>
          <p className="text-sm text-muted-foreground">
            When a candidate applies, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-headline font-bold text-foreground">Candidates</h1>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Candidates</AlertDialogTitle>
                    <AlertDialogDescription>
                        This page lists all new applicants who have submitted an application, as well as candidates who are currently in the interview process. From here, you can view their application, reject them, or move them forward to the next stage.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>Got it!</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">New Applicants ({newApplicants.length})</TabsTrigger>
          <TabsTrigger value="interviewing">Interviewing ({interviewingCandidates.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="new">
            <Card>
                <CardContent className="p-0">
                    <CandidatesTable candidates={newApplicants} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="interviewing">
            <Card>
                <CardContent className="p-0">
                    <CandidatesTable candidates={interviewingCandidates} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
