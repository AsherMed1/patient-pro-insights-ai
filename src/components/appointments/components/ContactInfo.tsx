
import React from 'react';
import { Mail, Phone } from 'lucide-react';

interface ContactInfoProps {
  email?: string;
  phoneNumber?: string;
}

const ContactInfo = ({ email, phoneNumber }: ContactInfoProps) => {
  return (
    <>
      {email && (
        <div className="flex items-start space-x-2">
          <Mail className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-600 break-all">{email}</span>
        </div>
      )}
      
      {phoneNumber && (
        <div className="flex items-center space-x-2">
          <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-600">{phoneNumber}</span>
        </div>
      )}
    </>
  );
};

export default ContactInfo;
