// Registration controller

export const register = async (req, res) => {
  try {
    const data = req.body;

    res.status(201).json({
      message: "Register controller working",
      data: data
    });

  } catch (error) {
    res.status(500).json({
      message: "Something went wrong"
    });
  }
};
