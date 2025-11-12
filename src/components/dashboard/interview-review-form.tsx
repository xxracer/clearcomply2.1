
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect } from "react";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
    onReviewSubmit: (data: InterviewReviewSchema) => void;
    isAlreadySubmitted: boolean;
    reviewData?: InterviewReviewSchema;
};


export function InterviewReviewForm({ candidateName, onReviewSubmit, isAlreadySubmitted, reviewData }: InterviewReviewFormProps) {

  const form = useForm<InterviewReviewSchema>({
    resolver: zodResolver(interviewReviewSchema),
    defaultValues: {
      applicantName: candidateName,
      date: new Date(),
      daysAvailable: [],
      interviewer: "",
      overallInterview: "",
    },
  });

  useEffect(() => {
    if (reviewData) {
      form.reset({
        ...reviewData,
        date: new Date(reviewData.date),
        interviewerDate: new Date(reviewData.interviewerDate),
      });
    } else {
       form.setValue("applicantName", candidateName);
    }
  }, [candidateName, reviewData, form]);

  function onSubmit(data: InterviewReviewSchema) {
    onReviewSubmit(data);
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
              value={field.value as string}
              className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-8"
              disabled={isAlreadySubmitted}
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
             <fieldset disabled={isAlreadySubmitted} className="space-y-8 group">
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
              {!isAlreadySubmitted && (
                <Button type="submit">Submit Review</Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
