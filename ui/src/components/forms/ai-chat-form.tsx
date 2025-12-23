"use client";

import { InlineAILoader } from "@/components/ui/ai-processing-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from '@/hooks/useSettings';
import aiChatApi from '@/lib/api/ai-chat.api';
import { Subject, subjectApi } from '@/lib/api/subject.api';
import { questionSchema, type QuestionFormData } from "@/lib/validations";
import { useUserStore } from '@/stores/user.store';
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from 'react-toastify';


interface AiChatFormProps {
  isLoading?: boolean;
  className?: string;
}

export default function AiChatForm({ isLoading = false, className = "" }: AiChatFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useUserStore(state => state.user);
  const router = useRouter();
  const { slug } = useParams<{ slug: string; }>();

  const { data: settings } = useSettings();

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      subject: "",
      question: "",
      files: [],
    },
  });

  const handleSubmit = async (data: QuestionFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('subject', data.subject.toString());
      formData.append('question', data.question);
      if (currentUser?.id) {
        formData.append('userId', currentUser.id.toString());
      }
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Submit the question
      const question = await aiChatApi.askQuestion(formData);

      // Show success message
      // toast.success("Question submitted successfully! Redirecting to answer page...");

      // Redirect to the answer page
      router.push(`/answer/${question.questionId}`);
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error("Failed to submit question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      if (settings?.maxFileUploadSize) {
        const maxSizeInBytes = settings.maxFileUploadSize * 1024 * 1024; // Convert MB to Bytes
        const oversizedFiles = files.filter(file => file.size > maxSizeInBytes);
        if (oversizedFiles.length > 0) {
          toast.error(`Some files exceed the maximum size of ${settings.maxFileUploadSize}MB and were not added.`);
          // Remove oversized files from the list
          files.splice(0, files.length, ...files.filter(file => file.size <= maxSizeInBytes));
        }
      }

      if (settings?.allowedFileTypes && settings.allowedFileTypes.length > 0) {
        const invalidFiles = files.filter(file => !settings.allowedFileTypes?.some(t => file.type.endsWith(t)));
        if (invalidFiles.length > 0) {
          toast.error(`Some files have invalid types and were not added.`);
          // Remove invalid type files from the list
          files.splice(0, files.length, ...files.filter(file => settings.allowedFileTypes?.some(t => file.type.endsWith(t))));
        }
      }

      if (files.length === 0) return;

      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const getSubjects = async () => {
      subjectApi.getAll(undefined, true).then((data) => {
        setSubjects(data);
      });
    };
    getSubjects();
  }, []);

  const { setValue } = form;
  useEffect(() => {
    if (slug && subjects.length > 0) {
      const matchedSubject = subjects.find(subj => subj.slug === slug);
      if (matchedSubject) {
        setValue("subject", matchedSubject.id + "");
      }
    }
  }, [slug, subjects, setValue]);

  return (
    <Card className={`w-full shadow-2xl border-0 bg-white/95 backdrop-blur-sm ${className}`}>
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Subject Selection */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Subject</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v)} value={field.value + ""}>
                    <FormControl>
                      <SelectTrigger className="h-14! text-lg w-full border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id + ""}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Input */}
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Your Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's your homework problem? Be as detailed as possible..."
                      className="min-h-[120px] border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">
                Upload Files (Optional)
              </label>

              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-gray-400"
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-purple-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, TXT, or images up to 10MB each
                </p>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                          <Upload className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="w-full h-12 bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isLoading || isSubmitting ? (
                <InlineAILoader text="Submitting" />
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Start Solving</span>
                </div>
              )}
            </Button>
          </form>
        </Form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Your AI assistant for academic success!
        </p>
      </CardContent>
    </Card>
  );
};