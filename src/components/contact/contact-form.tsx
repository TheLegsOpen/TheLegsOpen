"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const contactSchema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  topic: z.string().min(1, "Choose a topic."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const TOPICS = ["Tickets & Hospitality", "Membership", "Media & Press", "Something else"];

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", topic: "", message: "" },
  });

  async function onSubmit(values: ContactFormValues) {
    setServerError(null);
    setStatus("idle");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      reset();
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-secondary p-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
        <p className="font-display font-bold text-xl">Message sent</p>
        <p className="text-sm text-muted-foreground">Thanks for getting in touch — our team will reply within two working days.</p>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {status === "error" && serverError ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        <p className="text-xs text-muted-foreground">Demo tip: an email starting with &ldquo;fail@&rdquo; simulates a server error.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topic">Topic</Label>
        <select
          id="topic"
          aria-invalid={!!errors.topic}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("topic")}
        >
          <option value="">Choose a topic</option>
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        {errors.topic ? <p className="text-sm text-destructive">{errors.topic.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" aria-invalid={!!errors.message} {...register("message")} />
        {errors.message ? <p className="text-sm text-destructive">{errors.message.message}</p> : null}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Sending" : "Send message"}
      </Button>
    </form>
  );
}
