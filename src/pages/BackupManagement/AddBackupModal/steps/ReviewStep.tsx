import Typography from '../../../../components/Typography';
import { ReviewCard } from '../components';

type ReviewStepProps = {
  createErrorMessage?: string;
  defineDetails: string;
  defineMeta: string;
  destinationDetails: string;
  destinationMeta: string;
  schedulingDetails: string;
  schedulingMeta: string;
  scopeDetails: string;
  scopeMeta: string;
  onEditStep: (step: 1 | 2 | 3 | 4) => void;
};

export function ReviewStep({
  createErrorMessage,
  defineDetails,
  defineMeta,
  destinationDetails,
  destinationMeta,
  schedulingDetails,
  schedulingMeta,
  scopeDetails,
  scopeMeta,
  onEditStep,
}: ReviewStepProps) {
  return (
    <>
      <Typography as='h2' variant='pageTitle' className='font-semibold'>
        Review And Create
      </Typography>
      <Typography className='mt-1' variant='bodySm' color='muted'>
        Review your backup policy details below before creating. Make sure everything is set up correctly
      </Typography>

      {createErrorMessage && (
        <div className='mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3'>
          <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='mt-px h-4 w-4 shrink-0 text-red-500'>
            <circle cx='10' cy='10' r='8' />
            <path d='M10 6v4' strokeLinecap='round' />
            <circle cx='10' cy='13.5' r='0.5' fill='currentColor' />
          </svg>
          <Typography variant='bodySm' className='text-red-600'>{createErrorMessage}</Typography>
        </div>
      )}

      <div className='mt-8 space-y-4'>
        <ReviewCard title='Define Backup Policy' details={defineDetails} meta={defineMeta} onEdit={() => onEditStep(1)} />
        <ReviewCard title='Data Scope' details={scopeDetails} meta={scopeMeta} onEdit={() => onEditStep(2)} />
        <ReviewCard title='Scheduling' details={schedulingDetails} meta={schedulingMeta} onEdit={() => onEditStep(3)} />
        <ReviewCard title='Destination' details={destinationDetails} meta={destinationMeta} onEdit={() => onEditStep(4)} />
      </div>
    </>
  );
}
