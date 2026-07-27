export class Triple {
  public constructor(
    public x: number,
    public y: number,
    public z: number = 0
  ) {}
  public static fromArray(triple: number[]) {
    return new Triple(triple[0], triple[1], triple[2] || 0);
  }
  public toArray(): number[] {
    return [this.x, this.y, this.z];
  }

  public add(other: Triple): Triple {
    return new Triple(this.x + other.x, this.y + other.y, this.z + other.z);
  }
  public subtract(other: Triple): Triple {
    return new Triple(this.x - other.x, this.y - other.y, this.z - other.z);
  }
  public scale(scalar: number): Triple {
    return new Triple(this.x * scalar, this.y * scalar, this.z * scalar);
  }
}
