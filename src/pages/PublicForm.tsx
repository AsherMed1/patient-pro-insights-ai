
import React from 'react';
import { useParams } from 'react-router-dom';
import FormRenderer from '@/components/forms/FormRenderer';

const PublicForm = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground">Invalid form URL</p>
        </div>
      </div>
    );
  }

  return <FormRenderer slug={slug} />;
};

export default PublicForm;
