import * as tf from '@tensorflow/tfjs-node';

// Based on https://github.com/openai/gym/blob/master/gym/spaces/box.py
// Implementation of a space that represents closed boxes in euclidean space."""

// def _short_repr(arr: np.ndarray) -> str:
//     """Create a shortened string representation of a numpy array.

//     If arr is a multiple of the all-ones vector, return a string representation of the multiplier.
//     Otherwise, return a string representation of the entire array.

//     Args:
//         arr: The array to represent

//     Returns:
//         A short representation of the array
//     """
//     if arr.size != 0 and np.min(arr) == np.max(arr):
//         return str(np.min(arr))
//     return str(arr)


// def is_float_integer(var) -> bool:
//     """Checks if a variable is an integer or float."""
//     return np.issubdtype(type(var), np.integer) or np.issubdtype(type(var), np.floating)

/*
 * A (possibly unbounded) box in :math:`\mathbb{R}^n`.
 * 
 * Specifically, a Box represents the Cartesian product of n closed intervals.
 * Each interval has the form of one of :math:`[a, b]`, :math:`(-\infty, b]`,
 * :math:`[a, \infty)`, or :math:`(-\infty, \infty)`.
 * 
 * There are two common use cases:
 * 
 * * Identical bound for each dimension::
 * 
 *     >>> Box(low=-1.0, high=2.0, shape=(3, 4), dtype=np.float32)
 *     Box(3, 4)
 * 
 * * Independent bound for each dimension::
 * 
 *     >>> Box(low=np.array([-1.0, -2.0]), high=np.array([2.0, 4.0]), dtype=np.float32)
 *     Box(2,)
 */
export default class Box {

  boundedAbove: tf.Tensor;
  boundedBelow: tf.Tensor;
  high: tf.Tensor;
  low: tf.Tensor;
  seed?: number;
  shape: number[];

  /*
   * Constructor of :class:`Box`.
   * 
   * The argument ``low`` specifies the lower bound of each dimension and ``high`` specifies the upper bounds.
   * I.e., the space that is constructed will be the product of the intervals :math:`[\text{low}[i], \text{high}[i]]`.
   * 
   * If ``low`` (or ``high``) is a scalar, the lower bound (or upper bound, respectively) will be assumed to be
   * this value across all dimensions.
   * 
   * Args:
   *     low (Union[SupportsFloat, np.ndarray]): Lower bounds of the intervals.
   *     high (Union[SupportsFloat, np.ndarray]): Upper bounds of the intervals.
   *     shape (Optional[Sequence[int]]): The shape is inferred from the shape of `low` or `high` `np.ndarray`s with
   *         `low` and `high` scalars defaulting to a shape of (1,)
   *     dtype: The dtype of the elements of the space. If this is an integer type, the :class:`Box` is essentially a discrete space.
   *     seed: Optionally, you can use this argument to seed the RNG that is used to sample from the space.
   * 
   * Raises:
   *     ValueError: If no shape information is provided (shape is None, low is None and high is None) then a
   *         value error is raised.
   */
  constructor({
    low,
    high,
    shape,
    seed,
  }: {
    low: tf.Tensor;
    high: tf.Tensor;
    shape: number[];
    seed?: number;
  }) {
    if (low.shape.some((d, i) => d != shape[i])) {
      throw new RangeError(`The number of dimensions of the box (${shape}) did not match the shape of the vector of lower bounds (${low.shape}).`);
    }
    if (high.shape.some((d, i) => d != shape[i])) {
      throw new RangeError(`The number of dimensions of the box (${shape}) did not match the shape of the vector of upper bounds (${high.shape}).`);
    }

    this.high = high.broadcastTo(shape);
    this.low = low.broadcastTo(shape);

    this.shape = shape;
    this.seed = seed;

    this.boundedAbove = this.high.isFinite();
    this.boundedBelow = this.low.isFinite();
  }

  //     @property
  //     def shape(self) -> Tuple[int, ...]:
  //         """Has stricter type than gym.Space - never None."""
  //         return self._shape

  //     @property
  //     def is_np_flattenable(self):
  //         """Checks whether this space can be flattened to a :class:`spaces.Box`."""
  //         return True

  //     def is_bounded(self, manner: str = "both") -> bool:
  //         """Checks whether the box is bounded in some sense.

  //         Args:
  //             manner (str): One of ``"both"``, ``"below"``, ``"above"``.

  //         Returns:
  //             If the space is bounded

  //         Raises:
  //             ValueError: If `manner` is neither ``"both"`` nor ``"below"`` or ``"above"``
  //         """
  //         below = bool(np.all(self.bounded_below))
  //         above = bool(np.all(self.bounded_above))
  //         if manner == "both":
  //             return below and above
  //         elif manner == "below":
  //             return below
  //         elif manner == "above":
  //             return above
  //         else:
  //             raise ValueError(
  //                 f"manner is not in {{'below', 'above', 'both'}}, actual value: {manner}"
  //             )

  /*
   * Generates a single random sample inside the Box.
   * 
   * In creating a sample of the box, each coordinate is sampled (independently) from a distribution
   * that is chosen according to the form of the interval:
   * 
   * * :math:`[a, b]` : uniform distribution
   * * :math:`[a, \infty)` : shifted exponential distribution
   * * :math:`(-\infty, b]` : shifted negative exponential distribution
   * * :math:`(-\infty, \infty)` : normal distribution
   * 
   * Args:
   *     mask: A mask for sampling values from the Box space, currently unsupported.
   * 
   * Returns:
   *     A sampled value from the Box
   */
  sample(): tf.Tensor {

    // Masking arrays which classify the coordinates according to interval
    // type
    const unbounded = this.boundedBelow.logicalNot().logicalAnd(this.boundedAbove.logicalNot());
    const uppBounded = this.boundedBelow.logicalNot().logicalAnd(this.boundedAbove);
    const lowBounded = this.boundedBelow.logicalAnd(this.boundedAbove.logicalNot());
    const bounded = this.boundedBelow.logicalAnd(this.boundedAbove);

    // Vectorized sampling by interval type
    const highWithoutInf = this.high.where(this.high.isFinite(), tf.zeros(this.high.shape));
    const lowWithoutInf = this.low.where(this.low.isFinite(), tf.zeros(this.low.shape));

    const s1 = unbounded.mul(tf.randomNormal(unbounded.shape));
    console.log('s1:');
    s1.print();
    const s2 = lowBounded.mul(this._randomExponential(lowBounded.shape).add(lowWithoutInf));
    console.log('s2:');
    s2.print()
    const s3 = uppBounded.mul(this._randomExponential(uppBounded.shape).neg().add(highWithoutInf));
    console.log('s3:');
    s3.print();
    const s4 = bounded.mul(tf.randomUniform(bounded.shape).mul(highWithoutInf.sub(lowWithoutInf)).add(lowWithoutInf))
    console.log('s4:');
    s4.print();

    const sample = tf.fill(this.shape, 0)
      .add(unbounded.mul(tf.randomNormal(unbounded.shape)))
      .add(lowBounded.mul(this._randomExponential(lowBounded.shape).add(lowWithoutInf)))
      .add(uppBounded.mul(this._randomExponential(uppBounded.shape).neg().add(highWithoutInf)))
      .add(bounded.mul(tf.randomUniform(bounded.shape).mul(highWithoutInf.sub(lowWithoutInf)).add(lowWithoutInf)));
    return sample
  }

  _randomExponential(shape: number[]): tf.Tensor {
    return tf.randomUniform(shape).log().neg();
  }

  //     def contains(self, x) -> bool:
  //         """Return boolean specifying if x is a valid member of this space."""
  //         if not isinstance(x, np.ndarray):
  //             logger.warn("Casting input x to numpy array.")
  //             try:
  //                 x = np.asarray(x, dtype=self.dtype)
  //             except (ValueError, TypeError):
  //                 return False

  //         return bool(
  //             np.can_cast(x.dtype, self.dtype)
  //             and x.shape == self.shape
  //             and np.all(x >= self.low)
  //             and np.all(x <= self.high)
  //         )

  //     def to_jsonable(self, sample_n):
  //         """Convert a batch of samples from this space to a JSONable data type."""
  //         return np.array(sample_n).tolist()

  //     def from_jsonable(self, sample_n: Sequence[Union[float, int]]) -> List[np.ndarray]:
  //         """Convert a JSONable data type to a batch of samples from this space."""
  //         return [np.asarray(sample) for sample in sample_n]

  //     def __repr__(self) -> str:
  //         """A string representation of this space.

  //         The representation will include bounds, shape and dtype.
  //         If a bound is uniform, only the corresponding scalar will be given to avoid redundant and ugly strings.

  //         Returns:
  //             A representation of the space
  //         """
  //         return f"Box({self.low_repr}, {self.high_repr}, {self.shape}, {self.dtype})"

  //     def __eq__(self, other) -> bool:
  //         """Check whether `other` is equivalent to this instance. Doesn't check dtype equivalence."""
  //         return (
  //             isinstance(other, Box)
  //             and (self.shape == other.shape)
  //             # and (self.dtype == other.dtype)
  //             and np.allclose(self.low, other.low)
  //             and np.allclose(self.high, other.high)
  //         )

  //     def __setstate__(self, state: Dict):
  //         """Sets the state of the box for unpickling a box with legacy support."""
  //         super().__setstate__(state)

  //         # legacy support through re-adding "low_repr" and "high_repr" if missing from pickled state
  //         if not hasattr(self, "low_repr"):
  //             self.low_repr = _short_repr(self.low)

  //         if not hasattr(self, "high_repr"):
  //             self.high_repr = _short_repr(self.high)


  // def get_inf(dtype, sign: str) -> SupportsFloat:
  //     """Returns an infinite that doesn't break things.

  //     Args:
  //         dtype: An `np.dtype`
  //         sign (str): must be either `"+"` or `"-"`

  //     Returns:
  //         Gets an infinite value with the sign and dtype

  //     Raises:
  //         TypeError: Unknown sign, use either '+' or '-'
  //         ValueError: Unknown dtype for infinite bounds
  //     """
  //     if np.dtype(dtype).kind == "f":
  //         if sign == "+":
  //             return np.inf
  //         elif sign == "-":
  //             return -np.inf
  //         else:
  //             raise TypeError(f"Unknown sign {sign}, use either '+' or '-'")
  //     elif np.dtype(dtype).kind == "i":
  //         if sign == "+":
  //             return np.iinfo(dtype).max - 2
  //         elif sign == "-":
  //             return np.iinfo(dtype).min + 2
  //         else:
  //             raise TypeError(f"Unknown sign {sign}, use either '+' or '-'")
  //     else:
  //         raise ValueError(f"Unknown dtype {dtype} for infinite bounds")


  // def get_precision(dtype) -> SupportsFloat:
  //     """Get precision of a data type."""
  //     if np.issubdtype(dtype, np.floating):
  //         return np.finfo(dtype).precision
  //     else:
  //         return np.inf


  // def _broadcast(
  //     value: Union[SupportsFloat, np.ndarray],
  //     dtype,
  //     shape: Tuple[int, ...],
  //     inf_sign: str,
  // ) -> np.ndarray:
  //     """Handle infinite bounds and broadcast at the same time if needed."""
  //     if is_float_integer(value):
  //         value = get_inf(dtype, inf_sign) if np.isinf(value) else value  # type: ignore
  //         value = np.full(shape, value, dtype=dtype)
  //     else:
  //         assert isinstance(value, np.ndarray)
  //         if np.any(np.isinf(value)):
  //             # create new array with dtype, but maintain old one to preserve np.inf
  //             temp = value.astype(dtype)
  //             temp[np.isinf(value)] = get_inf(dtype, inf_sign)
  //             value = temp
  //     return value

}
