import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { registerMswTestHooks, renderInTestApp } from '@backstage/test-utils';

// Mock analytics & small backstage helpers before importing the component
const mockCaptureEvent = jest.fn();
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useAnalytics: () => ({ captureEvent: mockCaptureEvent }),
    // provide a no-op required helper so some backstage internals don't fail
    attachComponentData: () => {},
    createPlugin: (opts: any) => opts,
    createRoutableExtension: (opts: any) => opts,
  };
});

import RatingsFeedbackModal from './RatingsFeedbackModal';

describe('Ratings feedback modal', () => {
  const server = setupServer();
  registerMswTestHooks(server);

  beforeEach(() => {
    mockCaptureEvent.mockClear();
    server.use(
      rest.get('/*', (_, res, ctx) => res(ctx.status(200), ctx.json({}))),
    );
  });

  const render = (children: JSX.Element) => renderInTestApp(<>{children}</>);

  it('should render static elements', async () => {
    const handleClose = jest.fn();
    await render(<RatingsFeedbackModal handleClose={handleClose} open />);

    expect(
      screen.getByText('Share Your Valuable Feedback'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Type of feedback')).toBeInTheDocument();
    expect(screen.getByText('How was your experience?')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tell us why/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Red Hat's Privacy Statement/i }),
    ).toHaveAttribute('href', 'https://www.redhat.com/en/about/privacy-policy');
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('sends sentiment feedback and shows snackbar', async () => {
    const handleClose = jest.fn();
    await render(<RatingsFeedbackModal handleClose={handleClose} open />);

    const user = userEvent.setup();

    // Try to click a rating (Rating may render as radio inputs)
    const ratingRadios = screen.queryAllByRole('radio');
    if (ratingRadios.length > 0) {
      await user.click(ratingRadios[ratingRadios.length - 1]); // pick highest rating if present
    } else {
      // If radios not present, try clicking the visible Rating element
      const rating = screen.queryByLabelText('How was your experience?');
      if (rating) {
        await user.click(rating);
      }
    }

    // Fill feedback textarea
    const feedbackField = screen.getByLabelText(/Tell us why/i);
    await user.clear(feedbackField);
    await user.type(feedbackField, 'This is a helpful feedback note.');

    // Toggle checkbox by clicking visible label text
    await user.click(
      screen.getByText(/I understand that feedback is shared with Red Hat\./i),
    );

    // Assert checkbox became checked (role-based)
    const checkbox = screen.getByRole('checkbox', {
      name: /I understand that feedback is shared with Red Hat\./i,
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Submit
    const submitBtn = screen.getByTestId('sentiment-submit-btn');
    await user.click(submitBtn);

    // Wait for analytics to be called and snackbar to appear
    await waitFor(() =>
      expect(mockCaptureEvent).toHaveBeenCalledWith(
        'feedback',
        'sentiment',
        expect.objectContaining({
          attributes: expect.objectContaining({
            type: 'sentiment',
            feedback: 'This is a helpful feedback note.',
            ratings: expect.any(Number),
          }),
        }),
      ),
    );

    expect(
      await screen.findByText(/Thank you sharing the ratings and feedback/i),
    ).toBeInTheDocument();
  });

  it('sends feature-request feedback and shows snackbar', async () => {
    const handleClose = jest.fn();
    await render(<RatingsFeedbackModal handleClose={handleClose} open />);

    const user = userEvent.setup();

    // Open the select and choose Feature Request
    const select = screen.getByLabelText('Type of feedback');
    await user.click(select);

    // Material-UI renders options into a portal — look up by role 'option'
    const featureOption = await screen.findByRole('option', {
      name: 'Feature Request',
    });
    await user.click(featureOption);

    // Wait for feature request inputs to appear (by test ids)
    const titleContainer = await screen.findByTestId('issue-title');
    const descriptionContainer = await screen.findByTestId('issue-description');

    // Fill title and description by placeholder text (robust to MUI labeling)
    const titleInput =
      within(titleContainer).getByPlaceholderText('Enter a title');
    const descInput =
      within(descriptionContainer).getByPlaceholderText('Enter details');

    await user.type(titleInput, 'New great feature');
    await user.type(descInput, 'Please add support for X and Y.');

    // Toggle the consent checkbox
    await user.click(
      screen.getByText(/I understand that feedback is shared with Red Hat\./i),
    );
    const checkbox = screen.getByRole('checkbox', {
      name: /I understand that feedback is shared with Red Hat\./i,
    }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Submit
    const submitBtn = screen.getByTestId('sentiment-submit-btn');
    await user.click(submitBtn);

    // Wait for analytics to be called and snackbar to appear
    await waitFor(() =>
      expect(mockCaptureEvent).toHaveBeenCalledWith(
        'feedback',
        'issue',
        expect.objectContaining({
          attributes: expect.objectContaining({
            type: 'feature-request',
            title: 'New great feature',
            description: 'Please add support for X and Y.',
          }),
        }),
      ),
    );

    expect(
      await screen.findByText(/Thank you sharing this feature request/i),
    ).toBeInTheDocument();
  });
});
