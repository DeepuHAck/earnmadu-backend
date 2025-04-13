router.post('/test-email', authController.protect, async (req, res) => {
  try {
    await sendEmail({
      email: req.user.email,
      subject: 'Test Email',
      message: 'This is a test email to verify the email configuration.'
    });
    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test email',
      error: error.message
    });
  }
}); 