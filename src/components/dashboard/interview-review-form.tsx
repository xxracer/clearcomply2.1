
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  interviewReviewSchema,
  type InterviewReviewSchema,
} from "@/lib/schemas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";

const daysOfWeek = [
  { id: "M", label: "M" },
  { id: "Tu", label: "Tu" },
  { id: "W", label: "W" },
  { id: "Th", label: "Th" },
  { id: "F", label: "F" },
  { id: "Sa", label: "Sa" },
  { id: "Su", label: "Su" },
];

type InterviewReviewFormProps = {
    candidateName: string;
    onMoveToDocumentation: () => void;
};


export function InterviewReviewForm({ candidateName, onMoveToDocumentation }: InterviewReviewFormProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<InterviewReviewSchema>({
    resolver: zodResolver(interviewReviewSchema),
    defaultValues: {
      applicantName: "",
      daysAvailable: [],
      interviewer: "",
      overallInterview: "",
    },
  });

  useEffect(() => {
    if (candidateName) {
        form.setValue("applicantName", candidateName);
    }
  }, [candidateName, form]);

  function onSubmit(data: InterviewReviewSchema) {
    // In a real app, you'd save this data.
    // For this demo, we just show a toast and change the state.
    console.log("Interview Review Data:", data);
    toast({
      title: "Interview Review Submitted",
      description: "The review has been saved. You can now move the candidate to the next phase.",
    });
    setIsSubmitted(true);
  }

  const renderRadioGroup = (name: keyof InterviewReviewSchema, options: string[]) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value as string}
              className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-8"
              disabled={isSubmitted}
            >
              {options.map((option) => (
                <FormItem
                  key={option}
                  className="flex items-center space-x-2 space-y-0"
                >
                  <FormControl>
                    <RadioGroupItem value={option} />
                  </FormControl>
                  <FormLabel className="font-normal capitalize">{option}</FormLabel>
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Interview Review</CardTitle>
        <CardDescription>
          Fill out this form to review the candidate's interview.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <fieldset disabled={isSubmitted} className="space-y-8 group">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <FormField
                    control={form.control}
                    name="applicantName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Applicant Name</FormLabel>
                        <FormControl>
                        <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "PPP")
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                
                <FormField
                control={form.control}
                name="daysAvailable"
                render={() => (
                    <FormItem>
                    <div className="mb-4">
                        <FormLabel className="text-base">Days and Hours available</FormLabel>
                    </div>
                    <div className="flex flex-wrap gap-4">
                    {daysOfWeek.map((item) => (
                        <FormField
                        key={item.id}
                        control={form.control}
                        name="daysAvailable"
                        render={({ field }) => {
                            return (
                            <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                            >
                                <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                    return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                            (value) => value !== item.id
                                            )
                                        )
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal">
                                {item.label}
                                </FormLabel>
                            </FormItem>
                            )
                        }}
                        />
                    ))}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-4">
                        <FormLabel>Personality</FormLabel>
                        {renderRadioGroup("personality", ["friendly", "average", "quiet"])}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-4">
                        <FormLabel>Verbal skills</FormLabel>
                        {renderRadioGroup("verbalSkills", ["excellent", "average", "poor"])}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-4">
                        <FormLabel>Communicates</FormLabel>
                        {renderRadioGroup("communicates", ["clear", "somewhat clear", "not very clear"])}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-4">
                        <FormLabel>Flexibility</FormLabel>
                        {renderRadioGroup("flexibility", ["very flexible", "somewhat", "not flexible"])}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-4">
                        <FormLabel>Skill level</FormLabel>
                        {renderRadioGroup("skillLevel", ["higher skilled", "moderately skilled", "lower skilled"])}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] items-center gap-4">
                        <FormLabel>Appearance</FormLabel>
                        {renderRadioGroup("appearance", ["professional", "semi-professional", "not professional"])}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] items-center gap-4">
                        <FormLabel>Good Candidate for employment</FormLabel>
                        {renderRadioGroup("goodCandidate", ["yes", "no"])}
                    </div>
                </div>

                <FormField
                control={form.control}
                name="overallInterview"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Overall Interview</FormLabel>
                    <FormControl>
                        <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <FormField
                    control={form.control}
                    name="interviewer"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Interviewer</FormLabel>
                        <FormControl>
                        <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="interviewerDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "PPP")
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </fieldset>
            
            <div className="flex justify-end">
              {!isSubmitted ? (
                <Button type="submit">Submit Review</Button>
              ) : (
                <Button type="button" onClick={onMoveToDocumentation}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Move to Phase 3 Documentation
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
