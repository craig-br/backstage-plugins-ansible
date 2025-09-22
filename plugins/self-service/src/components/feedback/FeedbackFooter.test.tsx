import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// --- Mocks ---
// Mock RatingsFeedbackModal inside jest.mock to avoid ReferenceError
jest.mock('./RatingsFeedbackModal', () => ({
  __esModule: true,
  default: jest.fn((props: any) => (
    <div
      data-testid="mock-ratings-modal"
      data-open={props.open ? 'true' : 'false'}
    />
  )),
}));

import { FeedbackFooter } from './FeedbackFooter';

// Mock useTheme only — keep all other @material-ui/core exports intact
jest.mock('@material-ui/core', () => {
  const actual = jest.requireActual('@material-ui/core');
  return {
    ...actual,
    useTheme: () => ({ palette: { type: 'light' } }),
  };
});

describe('FeedbackFooter', () => {
  let mockRatingsFeedbackModal: jest.Mock;

  beforeEach(() => {
    // Access the mock function from the module after jest.mock
    mockRatingsFeedbackModal = require('./RatingsFeedbackModal').default;
    jest.clearAllMocks();
  });

  it('renders the FAB with "Feedback" label', async () => {
    await renderInTestApp(<FeedbackFooter />);

    expect(screen.getByText(/Feedback/i)).toBeInTheDocument();

    const fab = screen.getByRole('button', { name: /Feedback/i });
    expect(fab).toBeInTheDocument();
  });

  it('opens RatingsFeedbackModal when FAB is clicked and passes correct props', async () => {
    const user = userEvent.setup();

    await renderInTestApp(<FeedbackFooter />);

    const fab = screen.getByRole('button', { name: /Feedback/i });
    await user.click(fab);

    const modal = screen.getByTestId('mock-ratings-modal');
    expect(modal).toBeInTheDocument();

    // The mock component should have been called once
    expect(mockRatingsFeedbackModal).toHaveBeenCalledTimes(1);

    // Inspect the props passed to the mocked RatingsFeedbackModal
    const passedProps = mockRatingsFeedbackModal.mock.calls[0][0];
    expect(typeof passedProps.handleClose).toBe('function');
    expect(passedProps.open).toBe(true);
  });
});
