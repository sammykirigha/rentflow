'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { getSignedUrl, uploadImage } from '@/lib/api/upload.api';
import { userApi } from '@/lib/api/user.api';
import { MAX_FILE_SIZE } from '@/lib/tiptap-utils';
import { useUserStore } from '@/stores/user.store';
import { User } from '@/types/users';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, PictureInPicture, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../../components/ui/avatar';

const updateUserProfileSchema = z.object({
  firstName: z.string({ error: 'First name is required' }).min(1, 'First name is required'),
  lastName: z.string({ error: 'Last name is required' }).min(1, 'Last name is required'),
  email: z.email('Please enter a valid email address'),
  phone: z.string({ error: 'Phone is required' }),
});

type UpdateFormData = z.infer<typeof updateUserProfileSchema>;

export default function UpdateUserProfileForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileUpload, setFileUpload] = useState<File | null>();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore(state => state.setUser);

  const { fetchUserData } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateUserProfileSchema),
    mode: "all",
    defaultValues: {
      firstName: user?.firstName,
      phone: user?.phone as unknown as string,
      lastName: user?.lastName,
      email: user?.email,
    }
  });

  useEffect(() => {
    form.reset({
      firstName: user?.firstName,
      phone: user?.phone as unknown as string,
      lastName: user?.lastName,
      email: user?.email,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.message("File is too large. Please upload an image under 5MB.");
      e.target.value = "";
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setFileUpload(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data: UpdateFormData) => {
    setIsLoading(true);
    try {
      let finalAvatarUrl = user?.avatarUrl;

      if (fileUpload) {
        const uploadResponse = await uploadImage(fileUpload);
        const newKey = uploadResponse?.key;
        const encodedKey = encodeURIComponent(newKey!);
        const response = await getSignedUrl(encodedKey!);
        finalAvatarUrl = response?.url;
      }


      await userApi.updateProfile({
        ...data,
        avatarUrl: finalAvatarUrl,
      });

      toast.success('Profile Updated successfully!');
      fetchUserData();
      setUser({
        ...user,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        avatarUrl: finalAvatarUrl,
      } as User);
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to create account. Please try again.';

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; }; }; };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Form {...form}>
      <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">

          <div className=" flex flex-row items-center gap-10">
            <Avatar className='w-32 h-32 relative'>
              <AvatarImage src={previewUrl || user?.avatarUrl} className=' object-cover' />
              <AvatarFallback>{user?.firstName?.charAt(0)} {user?.lastName?.charAt(0)}</AvatarFallback>
              <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity rounded-full">
                <Button
                  type="button"
                  size={"icon"}
                  onClick={handleButtonClick}
                  className="w-6 h-6 cursor-pointer bg-primary!"
                >
                  <PictureInPicture className='w-5 h-5' />
                </Button>
              </div>
            </Avatar>

            {/* 4. Visible Styled Button */}
            <div className='flex flex-col gap-3'>
              <Button
                type="button"
                variant="outline"
                onClick={handleButtonClick}
                className="w-fit cursor-pointer"
              >
                Change Avatar
              </Button>
              <span>JPG, GIF, or PNG. Max 5MB</span>

            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif"
              className="hidden" // Completely hide it
            />
          </div>

          <div className="flex gap-4 flex-col md:flex-row items-start mt-10">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="text"
                        autoComplete="name"
                        className="pl-10"
                        placeholder="Enter your full name"
                        {...field}
                        value={field.value}
                      />
                      <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="text"
                        autoComplete="name"
                        className="pl-10"
                        placeholder="Enter your full name"
                        {...field}
                      />
                      <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4 flex-col md:flex-row items-start mt-10">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        autoComplete="email"
                        className="pl-10"
                        placeholder="Enter your email"
                        {...field}
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="string"
                        autoComplete="name"
                        className="pl-10"
                        placeholder="Enter your full name"
                        {...field}
                      />
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

        </div>

        <div className='mt-10 flex justify-end'>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Updating Profile...' : 'Update Profile'}
          </Button>
        </div>
      </form>
    </Form>
  );
}